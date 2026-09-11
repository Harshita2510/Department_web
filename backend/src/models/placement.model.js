import mongoose from 'mongoose';
import { PUBLICATION_STATUS } from '../constants/roles.js';

const placementSchema = new mongoose.Schema({
  academicYear: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}$/ },
  sheetUrl: { type: String, required: true },
  status: { type: String, enum: PUBLICATION_STATUS, default: 'draft', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: Date
}, { timestamps: true });

placementSchema.index({ status: 1, academicYear: -1 });
export const Placement = mongoose.model('Placement', placementSchema);
