import { Router } from 'express';
import { changePassword, createFaculty, login, logout, me } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../constants/roles.js';
import { changePasswordSchema, createFacultySchema, loginSchema } from '../validators/auth.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

export const authRouter = Router();
authRouter.post('/login', validate(loginSchema), asyncHandler(login));
authRouter.post('/logout', logout);
authRouter.get('/me', authenticate, me);
authRouter.patch('/password', authenticate, validate(changePasswordSchema), asyncHandler(changePassword));
authRouter.post('/faculty', authenticate, authorize(ROLES.ADMIN), validate(createFacultySchema), asyncHandler(createFaculty));
