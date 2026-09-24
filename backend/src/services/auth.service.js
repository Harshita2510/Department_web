import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { User } from '../models/user.model.js';
import { FacultyProfile } from '../models/faculty-profile.model.js';
import { AppError } from '../utils/app-error.js';
import { AuditLog } from '../models/audit-log.model.js';
import { createFacultySchema } from '../validators/auth.validator.js';
import { uploadCloudinaryImage, deleteCloudinaryImage } from './cloudinary.service.js';

export async function verifyCredentials(identifier, password) {
  const normalized = identifier.trim().toLowerCase();
  const user = await User.findOne({ $or: [{ email: normalized }, { facultyId: identifier.trim().toUpperCase() }] }).select('+passwordHash');
  if (!user || user.status !== 'active' || !await bcrypt.compare(password, user.passwordHash)) throw new AppError(401, 'Invalid credentials');
  return user;
}

function validateRegistrationPhoto(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024 || file.buffer.length > 5 * 1024 * 1024) throw new AppError(413, 'Photo must be 5 MB or smaller');
  const b = file.buffer;
  const signatures = {
    'image/jpeg': b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    'image/png': b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'image/webp': b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'
  };
  if (!/\.(jpe?g|png|webp)$/i.test(file.originalname) || !signatures[file.mimetype]) {
    throw new AppError(415, 'Photo must be a valid JPG, PNG or WebP image');
  }
}

async function cleanupRegistrationPhoto(publicId, facultyId) {
  let timer;
  try {
    // Bound cleanup latency; a failed cleanup must never replace the original error.
    const result = await Promise.race([
      deleteCloudinaryImage(publicId),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Photo cleanup timed out after 5 seconds')), 5000); })
    ]);
    if (!['ok', 'not found'].includes(result?.result)) throw new Error('Cloudinary did not confirm photo deletion');
  } catch (error) {
    console.error('Faculty registration photo cleanup failed', { public_id:publicId, employeeNumber:facultyId, reason:error.message });
  } finally {
    clearTimeout(timer);
  }
}

export async function createFacultyAccount(input, file, request) {
  const parsed = createFacultySchema.safeParse({ body:input });
  if (!parsed.success) throw new AppError(400, 'Invalid faculty registration', parsed.error.flatten());
  validateRegistrationPhoto(file);
  const { facultyId, temporaryPassword, ...details } = parsed.data.body;
  const existing = await User.findOne({ $or:[{ facultyId }, { email:details.email }] });
  if (existing) throw new AppError(409, existing.facultyId === facultyId ? 'Employee number is already registered' : 'Email ID is already registered');
  if (await FacultyProfile.exists({ facultyId })) throw new AppError(409, 'Employee number is already registered');

  const passwordHash = await bcrypt.hash(temporaryPassword, env.BCRYPT_ROUNDS);
  const userData = { _id:new mongoose.Types.ObjectId(), facultyId, email:details.email, passwordHash, role:'faculty', mustChangePassword:true };
  const now = new Date();
  const profileData = {
    user:userData._id, facultyId, draft:details, approvedSnapshot:details,
    reviewStatus:'approved', reviewedBy:request.user._id, reviewedAt:now, publishedAt:now
  };
  // Validate both documents before any external upload or database write.
  await new User(userData).validate();
  await new FacultyProfile(profileData).validate();
  const session = await mongoose.startSession();
  let photo;
  let user;
  try {
    if (file) {
      photo = await uploadCloudinaryImage(file, 'faculty');
      const fields = { ...details, photoUrl:photo.secure_url, photoPublicId:photo.public_id };
      profileData.draft = fields;
      profileData.approvedSnapshot = fields;
    }
    // The callback may retry: keep the single Cloudinary upload outside it.
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
    if (photo?.public_id) await cleanupRegistrationPhoto(photo.public_id, facultyId);
    if (error.code === 11000) {
      throw new AppError(409, error.keyPattern?.email ? 'Email ID is already registered' : 'Employee number is already registered');
    }
    throw error;
  } finally {
    await session.endSession();
  }
}
