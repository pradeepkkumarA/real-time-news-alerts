import crypto from 'crypto';
import Parser from 'rss-parser';
import Article from '../models/Article.js';
import { env } from '../config/env.js';
import { CATEGORIES, RSS_FEEDS } from '../config/constants.js';

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'NewsAlertsBot/1.0' },
  customFields: { item: [['media:content', 'media', { keepArray: false }], ['media:thumbnail', 'thumb']] },
});

const hash = (url) => crypto.createHash('sha1').update(url.split('#')[0].replace(/\/$/, '')).digest('hex');
const strip = (s = '') => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);

const normalize = ({ title, url, summary, image, source, category, publishedAt }) => {
  if (!title || !url) return null;
  const date = publishedAt ? new Date(publishedAt) : new Date();
  return {
    urlHash: hash(url),
    title: strip(title),
    url,
    summary: strip(summary),
    image: image || '',
    source,
    category: CATEGORIES.includes(category) ? category : 'general',
    publishedAt: Number.isNaN(date.getTime()) ? new Date() : date,
  };
};

async function fetchRssFeed([source, category, url]) {
  const feed = await parser.parseURL(url);
  return feed.items.slice(0, 30).map((i) =>
    normalize({
      title: i.title,
      url: i.link,
      summary: i.contentSnippet || i.summary || i.content,
      image: i.enclosure?.url || i.media?.$?.url || i.thumb?.$?.url || '',
      source,
      category,
      publishedAt: i.isoDate || i.pubDate,
    })
  );
}

async function fetchNewsApi() {
  if (!env.newsApiKey) return [];
  const queries = CATEGORIES.map((c) =>
    c === 'politics' || c === 'general'
      ? `q=${c === 'politics' ? 'politics' : 'breaking'}&`
      : `category=${c === 'sports' ? 'sports' : c}&`
  );
  const results = await Promise.allSettled(
    CATEGORIES.map(async (category, idx) => {
      const res = await fetch(
        `https://newsapi.org/v2/top-headlines?${queries[idx]}language=en&pageSize=40&apiKey=${env.newsApiKey}`
      );
      if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
      const data = await res.json();
      return (data.articles || []).map((a) =>
        normalize({
          title: a.title,
          url: a.url,
          summary: a.description,
          image: a.urlToImage,
          source: a.source?.name || 'NewsAPI',
          category,
          publishedAt: a.publishedAt,
        })
      );
    })
  );
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

async function collect() {
  const jobs = [fetchNewsApi(), ...RSS_FEEDS.map(fetchRssFeed)];
  const settled = await Promise.allSettled(jobs);
  const failed = settled.filter((r) => r.status === 'rejected').length;
  if (failed) console.warn(`[fetcher] ${failed}/${settled.length} sources failed`);
  const unique = new Map();
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    for (const a of r.value) if (a && !unique.has(a.urlHash)) unique.set(a.urlHash, a);
  }
  return [...unique.values()];
}

/**
 * Fetch from all sources, bulk-upsert (dedupe by URL hash) and return the newly inserted articles.
 * `seeded` is true on the very first run (empty DB) so callers can skip notifying for backlog.
 */
export async function ingest() {
  const items = await collect();
  if (!items.length) return { created: [], seeded: false };
  const seeded = (await Article.estimatedDocumentCount()) === 0;
  const res = await Article.bulkWrite(
    items.map((a) => ({
      updateOne: { filter: { urlHash: a.urlHash }, update: { $setOnInsert: a }, upsert: true },
    })),
    { ordered: false }
  );
  const ids = Object.values(res.upsertedIds || {});
  const created = ids.length
    ? await Article.find({ _id: { $in: ids } }).sort({ publishedAt: -1 }).lean()
    : [];
  return { created, seeded };
}
