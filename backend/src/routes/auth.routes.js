import { Router } from 'express';
import { changePassword, createFaculty, listFacultyAccounts, login, logout, me, resetFacultyPassword } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../constants/roles.js';
import { changePasswordSchema, createFacultySchema, loginSchema, resetFacultyPasswordSchema } from '../validators/auth.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

export const authRouter = Router();
authRouter.post('/login', validate(loginSchema), asyncHandler(login));
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, me);
authRouter.patch('/password', authenticate, validate(changePasswordSchema), asyncHandler(changePassword));
authRouter.get('/faculty',authenticate,authorize(ROLES.ADMIN),asyncHandler(listFacultyAccounts));
authRouter.post('/faculty', authenticate, authorize(ROLES.ADMIN), validate(createFacultySchema), asyncHandler(createFaculty));
authRouter.patch('/faculty/:facultyId/password',authenticate,authorize(ROLES.ADMIN),validate(resetFacultyPasswordSchema),asyncHandler(resetFacultyPassword));
