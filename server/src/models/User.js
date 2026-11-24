import mongoose from 'mongoose';
import { CATEGORIES, FREQUENCIES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    categories: { type: [{ type: String, enum: CATEGORIES }], default: ['general', 'technology'] },
    // empty array = all sources
    sources: { type: [String], default: [] },
    frequency: { type: String, enum: FREQUENCIES, default: 'immediate' },
    channels: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
    },
    pushSubscription: { type: mongoose.Schema.Types.Mixed, default: null },
    lastDigestAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.index({ frequency: 1 });

export const publicUser = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  categories: u.categories,
  sources: u.sources,
  frequency: u.frequency,
  channels: u.channels,
  pushEnabled: Boolean(u.pushSubscription),
});

export default mongoose.model('User', userSchema);
