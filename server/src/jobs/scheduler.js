import cron from 'node-cron';
import { env } from '../config/env.js';
import { ingest } from '../services/fetcher.js';
import { dispatchImmediate, runDigest } from '../services/notifier.js';

let ingesting = false;

export async function runIngestion(io) {
  if (ingesting) return;
  ingesting = true;
  try {
    const { created, seeded } = await ingest();
    console.log(`[ingest] ${created.length} new articles${seeded ? ' (initial seed, no alerts)' : ''}`);
    if (!created.length) return;
    // real-time stream for the live feed
    io.emit('news:new', { articles: created.slice(0, 50) });
    // alerts only for non-seed runs
    if (!seeded) await dispatchImmediate(created, io);
  } catch (err) {
    console.error('[ingest] failed:', err.message);
  } finally {
    ingesting = false;
  }
}

const safe = (name, fn) => async () => {
  try {
    await fn();
  } catch (err) {
    console.error(`[${name}] failed:`, err.message);
  }
};

export function startScheduler(io) {
  cron.schedule(env.fetchCron, () => runIngestion(io));
  cron.schedule('0 * * * *', safe('digest:hourly', () => runDigest('hourly', io)));
  cron.schedule('0 8 * * *', safe('digest:daily', () => runDigest('daily', io)));
  runIngestion(io); // initial fetch on boot
}
