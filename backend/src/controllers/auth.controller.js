import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { createFacultyAccount, verifyCredentials } from '../services/auth.service.js';
import { recordAudit } from '../services/audit.service.js';
import { AppError } from '../utils/app-error.js';
import { signAccessToken } from '../utils/token.js';
import { User } from '../models/user.model.js';
import { PERMISSIONS,ROLES } from '../constants/roles.js';

const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000, path: '/' };

export async function login(request, response) {
  const user = await verifyCredentials(request.body.identifier, request.body.password);
  const token = signAccessToken(user);
  response.cookie('accessToken', token, cookieOptions).json({ success: true, data: { id:user.id, facultyId:user.facultyId, email:user.email, role:user.role, permissions:user.permissions||[],mustChangePassword:user.mustChangePassword } });
}

export function logout(_request, response) {
  response.clearCookie('accessToken', cookieOptions).status(204).end();
}

export function me(request, response) {
  const user=request.user;
  response.json({ success:true, data:{ id:user.id, facultyId:user.facultyId, email:user.email, role:user.role, permissions:user.permissions||[],mustChangePassword:user.mustChangePassword } });
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
  const user = await createFacultyAccount(request.body, request);
  response.status(201).json({ success: true, data: { id:user.id, facultyId:user.facultyId, role:user.role, mustChangePassword:true } });
}

export async function listFacultyAccounts(_request,response){
  const users=await User.find({role:ROLES.FACULTY})
    .select('facultyId status permissions mustChangePassword updatedAt')
    .sort({facultyId:1})
    .limit(1000)
    .lean();
  response.json({success:true,data:users});
}

export async function resetFacultyPassword(request,response){
  const user=await User.findOne({facultyId:request.params.facultyId,role:ROLES.FACULTY}).select('+passwordHash');
  if(!user)throw new AppError(404,'Faculty account not found');
  user.passwordHash=await bcrypt.hash(request.body.temporaryPassword,env.BCRYPT_ROUNDS);
  user.mustChangePassword=true;
  user.tokenVersion+=1;
  await user.save();
  await recordAudit(request,'FACULTY_PASSWORD_RESET','User',user.id,{facultyId:user.facultyId});
  response.json({success:true,data:{facultyId:user.facultyId,mustChangePassword:true}});
}

export async function updateFacultyNoticePermission(request,response){
  const user=await User.findOne({facultyId:request.params.facultyId,role:ROLES.FACULTY});
  if(!user)throw new AppError(404,'Faculty account not found');
  const permissions=new Set(user.permissions||[]);
  if(request.body.allowed)permissions.add(PERMISSIONS.NOTICE_UPLOAD);else permissions.delete(PERMISSIONS.NOTICE_UPLOAD);
  user.permissions=[...permissions];
  await user.save();
  await recordAudit(request,'FACULTY_NOTICE_PERMISSION_UPDATED','User',user.id,{facultyId:user.facultyId,allowed:request.body.allowed});
  response.json({success:true,data:{facultyId:user.facultyId,permissions:user.permissions}});
}
