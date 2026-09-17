import { Router } from 'express';
import { createAcademicDocument,deleteAcademicDocument,deleteTimetableFile,listManagedAcademicDocuments,listPublicAcademicDocuments,publishTimetable,updateAcademicDocument,uploadTimetable } from '../controllers/academic-document.controller.js';
import { authenticate,authorize } from '../middleware/auth.middleware.js';import { validate } from '../middleware/validate.middleware.js';import { ROLES } from '../constants/roles.js';import { asyncHandler } from '../utils/async-handler.js';
import { academicDocumentIdSchema,createAcademicDocumentSchema,timetableSlotParamsSchema,updateAcademicDocumentSchema } from '../validators/academic-document.validator.js';
import { uploadTimetableFile } from '../middleware/upload.middleware.js';

export const academicDocumentRouter=Router();
academicDocumentRouter.get('/public',asyncHandler(listPublicAcademicDocuments));
academicDocumentRouter.get('/managed',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),asyncHandler(listManagedAcademicDocuments));
academicDocumentRouter.post('/:id/timetable/:slot/upload',authenticate,authorize(ROLES.ADMIN,ROLES.FACULTY),validate(timetableSlotParamsSchema),uploadTimetableFile,asyncHandler(uploadTimetable));
academicDocumentRouter.post('/:id/timetable/:slot/publish',authenticate,authorize(ROLES.ADMIN),validate(timetableSlotParamsSchema),asyncHandler(publishTimetable));
academicDocumentRouter.delete('/:id/timetable/:slot',authenticate,authorize(ROLES.ADMIN),validate(timetableSlotParamsSchema),asyncHandler(deleteTimetableFile));
academicDocumentRouter.get('/',authenticate,authorize(ROLES.ADMIN),asyncHandler(listManagedAcademicDocuments));
academicDocumentRouter.post('/',authenticate,authorize(ROLES.ADMIN),validate(createAcademicDocumentSchema),asyncHandler(createAcademicDocument));
academicDocumentRouter.patch('/:id',authenticate,authorize(ROLES.ADMIN),validate(updateAcademicDocumentSchema),asyncHandler(updateAcademicDocument));
academicDocumentRouter.delete('/:id',authenticate,authorize(ROLES.ADMIN),validate(academicDocumentIdSchema),asyncHandler(deleteAcademicDocument));
