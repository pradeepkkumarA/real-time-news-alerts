import User from '../models/User.js';
import Article from '../models/Article.js';
import AlertHistory from '../models/AlertHistory.js';
import { sendAlertEmail } from './mailer.js';
import { sendPush } from './push.js';
import { env } from '../config/env.js';

const MAX_PER_RUN = 10; // cap alerts per user per run to avoid floods
const DIGEST_LIMIT = 25;

const matches = (user, a) =>
  user.categories.includes(a.category) && (!user.sources.length || user.sources.includes(a.source));

/** Idempotently log an alert; returns the stored doc. */
const log = (userId, articleId, channel) =>
  AlertHistory.findOneAndUpdate(
    { userId, articleId, channel },
    { $setOnInsert: { sentAt: new Date(), read: false } },
    { upsert: true, new: true }
  ).lean();

async function deliver(user, articles, io, { digest }) {
  // 1. in-app (always logged; shown live for immediate users)
  const liveDocs = await Promise.all(articles.map((a) => log(user._id, a._id, 'live')));
  if (digest) {
    io.to(`user:${user._id}`).emit('alert:digest', { count: articles.length });
  } else {
    liveDocs.forEach((doc, i) =>
      io.to(`user:${user._id}`).emit('alert:new', { alert: { ...doc, article: articles[i] } })
    );
  }

  // 2. email
  if (user.channels?.email) {
    try {
      await sendAlertEmail(user, articles, { digest });
      await Promise.all(articles.map((a) => log(user._id, a._id, 'email')));
    } catch (err) {
      console.warn(`[notifier] email to ${user.email} failed: ${err.message}`);
    }
  }

  // 3. web push
  if (user.channels?.push && user.pushSubscription) {
    const payload = digest
      ? { title: 'News digest', body: `${articles.length} new stories match your preferences`, url: env.appUrl }
      : { title: articles[0].title, body: `${articles[0].source} · ${articles[0].category}`, url: articles[0].url };
    const status = await sendPush(user.pushSubscription, payload);
    if (status === 'ok') await Promise.all(articles.map((a) => log(user._id, a._id, 'push')));
    if (status === 'gone') {
      await User.updateOne({ _id: user._id }, { $set: { pushSubscription: null, 'channels.push': false } });
    }
  }
}

/** Notify `immediate` users about freshly ingested articles. */
export async function dispatchImmediate(articles, io) {
  if (!articles.length) return;
  const users = await User.find({ frequency: 'immediate' }).lean();
  for (const user of users) {
    const matched = articles.filter((a) => matches(user, a)).slice(0, MAX_PER_RUN);
    if (matched.length) await deliver(user, matched, io, { digest: false });
  }
}

/** Send hourly/daily digests of articles ingested since each user's last digest. */
export async function runDigest(frequency, io) {
  const users = await User.find({ frequency }).lean();
  const now = new Date();
  for (const user of users) {
    const query = {
      createdAt: { $gt: user.lastDigestAt || new Date(0) },
      category: { $in: user.categories },
    };
    if (user.sources.length) query.source = { $in: user.sources };
    const articles = await Article.find(query).sort({ publishedAt: -1 }).limit(DIGEST_LIMIT).lean();
    await User.updateOne({ _id: user._id }, { $set: { lastDigestAt: now } });
    if (articles.length) await deliver(user, articles, io, { digest: true });
  }
  console.log(`[digest:${frequency}] processed ${users.length} users`);
}
