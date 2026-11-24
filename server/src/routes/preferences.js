import { Router } from 'express';
import User, { publicUser } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { CATEGORIES, FREQUENCIES } from '../config/constants.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => res.json({ preferences: publicUser(req.user) }));

router.put('/', async (req, res, next) => {
  try {
    const { categories, sources, frequency, channels } = req.body || {};
    const user = req.user;
    if (Array.isArray(categories)) user.categories = categories.filter((c) => CATEGORIES.includes(c));
    if (Array.isArray(sources)) user.sources = [...new Set(sources.filter((s) => typeof s === 'string'))].slice(0, 100);
    if (FREQUENCIES.includes(frequency)) user.frequency = frequency;
    if (channels && typeof channels === 'object') {
      if (typeof channels.email === 'boolean') user.channels.email = channels.email;
      if (typeof channels.push === 'boolean') user.channels.push = channels.push && Boolean(user.pushSubscription);
    }
    await user.save();
    res.json({ preferences: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/push-subscription', async (req, res, next) => {
  try {
    const sub = req.body?.subscription;
    if (!sub?.endpoint || !sub?.keys) return res.status(400).json({ message: 'Invalid subscription' });
    req.user.pushSubscription = sub;
    req.user.channels.push = true;
    await req.user.save();
    res.json({ preferences: publicUser(req.user) });
  } catch (err) {
    next(err);
  }
});

router.delete('/push-subscription', async (req, res, next) => {
  try {
    req.user.pushSubscription = null;
    req.user.channels.push = false;
    await req.user.save();
    res.json({ preferences: publicUser(req.user) });
  } catch (err) {
    next(err);
  }
});

export default router;
