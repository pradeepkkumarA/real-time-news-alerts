import { Router } from 'express';
import Article from '../models/Article.js';
import { CATEGORIES, FREQUENCIES } from '../config/constants.js';
import { env } from '../config/env.js';

const router = Router();

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/meta', async (_req, res, next) => {
  try {
    const sources = (await Article.distinct('source')).sort();
    res.json({ categories: CATEGORIES, frequencies: FREQUENCIES, sources, vapidPublicKey: env.vapid.publicKey });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { category, source, q } = req.query;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const filter = {};
    if (CATEGORIES.includes(category)) filter.category = category;
    if (typeof source === 'string' && source) filter.source = source;
    if (typeof q === 'string' && q.trim()) filter.title = new RegExp(escapeRe(q.trim().slice(0, 80)), 'i');

    const [articles, total] = await Promise.all([
      Article.find(filter).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Article.countDocuments(filter),
    ]);
    res.json({ articles, total, page, hasMore: page * limit < total });
  } catch (err) {
    next(err);
  }
});

export default router;
