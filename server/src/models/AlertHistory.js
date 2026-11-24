import mongoose from 'mongoose';
import { CHANNELS } from '../config/constants.js';

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  channel: { type: String, enum: CHANNELS, required: true },
  read: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now },
});

// one alert per user/article/channel
alertSchema.index({ userId: 1, articleId: 1, channel: 1 }, { unique: true });
alertSchema.index({ userId: 1, sentAt: -1 });

export default mongoose.model('AlertHistory', alertSchema);
