import { Router } from 'express';
import mongoose from 'mongoose';
import AlertHistory from '../models/AlertHistory.js';
import Article from '../models/Article.js';
import { requireAuth } from '../middleware/auth.js';
import { CHANNELS } from '../config/constants.js';

const router = Router();
router.use(requireAuth);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res, next) => {
  try {
    const { q, channel, unread } = req.query;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const filter = { userId: req.user._id };
    if (CHANNELS.includes(channel)) filter.channel = channel;
    if (unread === 'true') filter.read = false;
    if (typeof q === 'string' && q.trim()) {
      const re = new RegExp(escapeRe(q.trim().slice(0, 80)), 'i');
      const ids = await Article.find({ $or: [{ title: re }, { source: re }, { category: re }] }, '_id').limit(500).lean();
      filter.articleId = { $in: ids.map((a) => a._id) };
    }

    const [alerts, total, unreadCount] = await Promise.all([
      AlertHistory.find(filter)
        .sort({ sentAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('articleId')
        .lean(),
      AlertHistory.countDocuments(filter),
      AlertHistory.countDocuments({ userId: req.user._id, channel: 'live', read: false }),
    ]);

    res.json({
      alerts: alerts
        .filter((a) => a.articleId)
        .map(({ articleId, ...rest }) => ({ ...rest, article: articleId })),
      total,
      page,
      hasMore: page * limit < total,
      unread: unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    await AlertHistory.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// marks every channel entry for the same article as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const alert = await AlertHistory.findOne({ _id: req.params.id, userId: req.user._id });
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    await AlertHistory.updateMany({ userId: req.user._id, articleId: alert.articleId }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
