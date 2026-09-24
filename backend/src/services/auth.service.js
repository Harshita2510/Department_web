import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { FacultyProfile } from '../models/faculty-profile.model.js';
import { AppError } from '../utils/app-error.js';
import { AuditLog } from '../models/audit-log.model.js';
import { createFacultySchema } from '../validators/auth.validator.js';

export async function verifyCredentials(identifier, password) {
  const normalized = identifier.trim().toLowerCase();
  const user = await User.findOne({ $or: [{ email: normalized }, { facultyId: identifier.trim().toUpperCase() }] }).select('+passwordHash');
  if (!user || user.status !== 'active' || !await bcrypt.compare(password, user.passwordHash)) throw new AppError(401, 'Invalid credentials');
  return user;
}

export async function createFacultyAccount(input, request) {
  const parsed = createFacultySchema.safeParse({ body:input });
  if (!parsed.success) throw new AppError(400, 'Invalid faculty registration', parsed.error.flatten());
  const { facultyId, temporaryPassword } = parsed.data.body;
  const existing = await User.findOne({ facultyId });
  if (existing) throw new AppError(409, 'Employee number is already registered');
  if (await FacultyProfile.exists({ facultyId })) throw new AppError(409, 'Employee number is already registered');

  const passwordHash = await bcrypt.hash(temporaryPassword, env.BCRYPT_ROUNDS);
  const userData = { _id:new mongoose.Types.ObjectId(), facultyId, passwordHash, role:'faculty', mustChangePassword:true };
  const profileData = {
    user:userData._id, facultyId, draft:{ department:'Computer Science & Engineering' }, approvedSnapshot:null, reviewStatus:'draft'
  };
  await new User(userData).validate();
  await new FacultyProfile(profileData).validate();
  const session = await mongoose.startSession();
  let user;
  try {
    await session.withTransaction(async () => {
      [user] = await User.create([userData], { session });
      await FacultyProfile.create([profileData], { session });
      await AuditLog.create([{
        actor:request.user._id, action:'FACULTY_ACCOUNT_CREATED', resourceType:'User',
        resourceId:String(userData._id), metadata:{ facultyId }, ip:request.ip, userAgent:request.get('user-agent')
      }], { session });
    });
    return user;
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(409, error.keyPattern?.email ? 'Email ID is already registered' : 'Employee number is already registered');
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
