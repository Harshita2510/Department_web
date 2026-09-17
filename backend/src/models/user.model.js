import mongoose from 'mongoose';
import { PERMISSIONS,ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema({
  facultyId: { type: String, trim: true, uppercase: true },
  email: { type: String, trim: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: Object.values(ROLES), required: true },
  permissions: [{ type:String, enum:Object.values(PERMISSIONS) }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  mustChangePassword: { type: Boolean, default: true },
  tokenVersion: { type: Number, default: 0 }
}, { timestamps: true });

userSchema.index({ facultyId: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1, status: 1 });

export const User = mongoose.model('User', userSchema);
