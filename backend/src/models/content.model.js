import mongoose from 'mongoose';
import { CONTENT_TYPES, PUBLICATION_STATUS } from '../constants/roles.js';

const assetSchema = new mongoose.Schema({
  provider: { type:String, enum:['cloudinary','gridfs'] }, key:String, publicId:String,
  url:String, originalUrl:String, name:String, mimeType:String, size:Number,
  width:Number, height:Number, format:String
}, { _id: false });
const contentSchema = new mongoose.Schema({
  type: { type: String, enum: CONTENT_TYPES, required: true, index: true },
  title: { type: String, required: true, trim: true }, category: String, summary: String, body: String,
  displayDate: Date, featured: { type: Boolean, default: false }, asset: assetSchema,
  status: { type: String, enum: PUBLICATION_STATUS, default: 'draft', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, publishedAt: Date
}, { timestamps: true });

contentSchema.index({ type: 1, status: 1, displayDate: -1 });
contentSchema.index({ title: 'text', summary: 'text', body: 'text' });
export const Content = mongoose.model('Content', contentSchema);
