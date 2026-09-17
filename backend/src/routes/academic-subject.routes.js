import { Router } from 'express';
import { createSubject,deleteSubject,listManagedSubjects,listPublicSubjects,publishSubjectSyllabus,requestSyllabusChanges,updateSubject,uploadSubjectSyllabus } from '../controllers/academic-subject.controller.js';
import { authenticate,authorize } from '../middleware/auth.middleware.js';
import { uploadSyllabus } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../constants/roles.js';
import { academicSubjectIdSchema,createAcademicSubjectSchema,updateAcademicSubjectSchema } from '../validators/academic-subject.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

export const academicSubjectRouter=Router();
academicSubjectRouter.get('/public',asyncHandler(listPublicSubjects));
academicSubjectRouter.get('/managed',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),asyncHandler(listManagedSubjects));
academicSubjectRouter.post('/',authenticate,authorize(ROLES.ADMIN),validate(createAcademicSubjectSchema),asyncHandler(createSubject));
academicSubjectRouter.patch('/:id',authenticate,authorize(ROLES.ADMIN),validate(updateAcademicSubjectSchema),asyncHandler(updateSubject));
academicSubjectRouter.post('/:id/syllabus',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),validate(academicSubjectIdSchema),uploadSyllabus,asyncHandler(uploadSubjectSyllabus));
academicSubjectRouter.post('/:id/publish',authenticate,authorize(ROLES.ADMIN),validate(academicSubjectIdSchema),asyncHandler(publishSubjectSyllabus));
academicSubjectRouter.post('/:id/request-changes',authenticate,authorize(ROLES.ADMIN),validate(academicSubjectIdSchema),asyncHandler(requestSyllabusChanges));
academicSubjectRouter.delete('/:id',authenticate,authorize(ROLES.ADMIN),validate(academicSubjectIdSchema),asyncHandler(deleteSubject));
