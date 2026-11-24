import mongoose from 'mongoose';
import { CATEGORIES } from '../config/constants.js';

const articleSchema = new mongoose.Schema(
  {
    urlHash: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    url: { type: String, required: true },
    summary: { type: String, default: '' },
    image: { type: String, default: '' },
    source: { type: String, required: true, index: true },
    category: { type: String, enum: CATEGORIES, default: 'general', index: true },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

articleSchema.index({ publishedAt: -1 });
articleSchema.index({ createdAt: -1 });
articleSchema.index({ title: 'text', summary: 'text' });

export default mongoose.model('Article', articleSchema);
