import webpush from 'web-push';
import { env } from '../config/env.js';

export const pushEnabled = Boolean(env.vapid.publicKey && env.vapid.privateKey);

if (pushEnabled) {
  webpush.setVapidDetails(env.vapid.subject, env.vapid.publicKey, env.vapid.privateKey);
}

/** Returns 'ok', 'gone' (subscription expired) or 'error'. */
export async function sendPush(subscription, payload) {
  if (!pushEnabled || !subscription) return 'error';
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return 'ok';
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) return 'gone';
    console.warn('[push] failed:', err.statusCode || err.message);
    return 'error';
  }
}
