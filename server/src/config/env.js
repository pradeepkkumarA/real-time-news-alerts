import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

const list = (v, fallback) =>
  (v || fallback)
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

export const env = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/news-alerts',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  clientUrls: list(process.env.CLIENT_URL, 'http://localhost:5173'),
  appUrl: (process.env.APP_URL || list(process.env.CLIENT_URL, 'http://localhost:5173')[0]).replace(/\/$/, ''),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'News Alerts <no-reply@example.com>',
  },
  newsApiKey: process.env.NEWS_API_KEY || '',
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  },
  fetchCron: process.env.FETCH_CRON || '*/5 * * * *',
};
