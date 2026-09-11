import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { createFacultyAccount, verifyCredentials } from '../services/auth.service.js';
import { recordAudit } from '../services/audit.service.js';
import { AppError } from '../utils/app-error.js';
import { signAccessToken } from '../utils/token.js';

const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000, path: '/' };

export async function login(request, response) {
  const user = await verifyCredentials(request.body.identifier, request.body.password);
  const token = signAccessToken(user);
  response.cookie('accessToken', token, cookieOptions).json({ success: true, data: { id:user.id, facultyId:user.facultyId, email:user.email, role:user.role, mustChangePassword:user.mustChangePassword } });
}

export function logout(_request, response) {
  response.clearCookie('accessToken', cookieOptions).status(204).end();
}

export function me(request, response) {
  const user=request.user;
  response.json({ success:true, data:{ id:user.id, facultyId:user.facultyId, email:user.email, role:user.role, mustChangePassword:user.mustChangePassword } });
}

export async function changePassword(request, response) {
  const user = await request.user.constructor.findById(request.user.id).select('+passwordHash');
  if (!await bcrypt.compare(request.body.currentPassword, user.passwordHash)) throw new AppError(400, 'Current password is incorrect');
  user.passwordHash = await bcrypt.hash(request.body.newPassword, env.BCRYPT_ROUNDS);
  user.mustChangePassword = false;
  user.tokenVersion += 1;
  await user.save();
  await recordAudit(request, 'PASSWORD_CHANGED', 'User', user.id);
  response.clearCookie('accessToken', cookieOptions).json({ success: true, message: 'Password changed. Sign in again.' });
}

export async function createFaculty(request, response) {
  const user = await createFacultyAccount(request.body.facultyId, request.body.temporaryPassword);
  await recordAudit(request, 'FACULTY_ACCOUNT_CREATED', 'User', user.id, { facultyId:user.facultyId });
  response.status(201).json({ success: true, data: { id:user.id, facultyId:user.facultyId, role:user.role, mustChangePassword:true } });
}
