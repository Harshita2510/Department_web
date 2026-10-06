import { Router } from 'express';
import { createQuestionPaper,deleteQuestionPaper,listPublicQuestionPapers,listQuestionPapers,updateQuestionPaper,uploadQuestionPaper } from '../controllers/question-paper.controller.js';
import { authenticate,authorize } from '../middleware/auth.middleware.js';
import { uploadQuestionPaperPdf,verifyUploadContents } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../constants/roles.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createQuestionPaperSchema,questionPaperIdSchema,updateQuestionPaperSchema } from '../validators/question-paper.validator.js';
import { publicQuestionPaperQuerySchema } from '../validators/query.validator.js';

export const questionPaperRouter=Router();
questionPaperRouter.get('/public',validate(publicQuestionPaperQuerySchema),asyncHandler(listPublicQuestionPapers));
questionPaperRouter.get('/',authenticate,authorize(ROLES.ADMIN),asyncHandler(listQuestionPapers));
questionPaperRouter.post('/',authenticate,authorize(ROLES.ADMIN),validate(createQuestionPaperSchema),asyncHandler(createQuestionPaper));
questionPaperRouter.patch('/:id',authenticate,authorize(ROLES.ADMIN),validate(updateQuestionPaperSchema),asyncHandler(updateQuestionPaper));
questionPaperRouter.post('/:id/upload',authenticate,authorize(ROLES.ADMIN),validate(questionPaperIdSchema),uploadQuestionPaperPdf,verifyUploadContents,asyncHandler(uploadQuestionPaper));
questionPaperRouter.delete('/:id',authenticate,authorize(ROLES.ADMIN),validate(questionPaperIdSchema),asyncHandler(deleteQuestionPaper));
