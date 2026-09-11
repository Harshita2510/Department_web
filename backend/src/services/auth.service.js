import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { FacultyProfile } from '../models/faculty-profile.model.js';
import { AppError } from '../utils/app-error.js';

export async function verifyCredentials(identifier, password) {
  const normalized = identifier.trim().toLowerCase();
  const user = await User.findOne({ $or: [{ email: normalized }, { facultyId: identifier.trim().toUpperCase() }] }).select('+passwordHash');
  if (!user || user.status !== 'active' || !await bcrypt.compare(password, user.passwordHash)) throw new AppError(401, 'Invalid credentials');
  return user;
}

export async function createFacultyAccount(facultyId, temporaryPassword) {
  const passwordHash = await bcrypt.hash(temporaryPassword, env.BCRYPT_ROUNDS);
  const user = await User.create({ facultyId, passwordHash, role: 'faculty', mustChangePassword: true });
  try {
    await FacultyProfile.create({ user: user._id, facultyId, draft: {} });
    return user;
  } catch (error) {
    await User.findByIdAndDelete(user.id);
    throw error;
  }
}
