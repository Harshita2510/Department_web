import { Router } from 'express';
import { approveFaculty, deleteFaculty, getOwnProfile, getPublicFaculty, listFaculty, listFacultyAccessOptions, listPublicFaculty, submitOwnProfile, updateOwnProfile } from '../controllers/faculty.controller.js';
import { authenticate, authorize, requirePasswordChanged } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../constants/roles.js';
import { facultyDraftSchema, facultyIdSchema } from '../validators/faculty.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

export const facultyRouter = Router();
facultyRouter.get('/public', asyncHandler(listPublicFaculty));
facultyRouter.get('/public/:facultyId', asyncHandler(getPublicFaculty));
facultyRouter.get('/me', authenticate, authorize(ROLES.FACULTY), asyncHandler(getOwnProfile));
facultyRouter.patch('/me', authenticate, authorize(ROLES.FACULTY), requirePasswordChanged, validate(facultyDraftSchema), asyncHandler(updateOwnProfile));
facultyRouter.post('/me/submit', authenticate, authorize(ROLES.FACULTY), requirePasswordChanged, asyncHandler(submitOwnProfile));
facultyRouter.get('/access-options', authenticate, authorize(ROLES.ADMIN), asyncHandler(listFacultyAccessOptions));
facultyRouter.get('/', authenticate, authorize(ROLES.ADMIN), asyncHandler(listFaculty));
facultyRouter.post('/:id/approve', authenticate, authorize(ROLES.ADMIN), validate(facultyIdSchema), asyncHandler(approveFaculty));
facultyRouter.delete('/:id', authenticate, authorize(ROLES.ADMIN), validate(facultyIdSchema), asyncHandler(deleteFaculty));
