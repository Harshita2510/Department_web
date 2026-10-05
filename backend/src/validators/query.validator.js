import { z } from 'zod';
import { CONTENT_TYPES } from '../constants/roles.js';

const page=z.coerce.number().int().min(1).max(1_000_000).optional();
const limit=(maximum=100)=>z.coerce.number().int().min(1).max(maximum).optional();
const query=(shape)=>z.object({query:z.object(shape).strict()});

export const publicContentQuerySchema=query({type:z.enum(CONTENT_TYPES).optional()});
export const managedContentQuerySchema=query({type:z.enum(CONTENT_TYPES).optional(),page,limit:limit()});
export const publicSubjectQuerySchema=query({programme:z.enum(['ug-cse','pg-cse']).optional(),semester:z.coerce.number().int().min(1).max(8).optional()});
export const academicDocumentQuerySchema=query({type:z.enum(['syllabus','timetable','academic-calendar']).optional()});
export const publicQuestionPaperQuerySchema=query({programme:z.enum(['ug-cse','pg-cse']).optional(),semester:z.coerce.number().int().min(1).max(8).optional(),examType:z.enum(['mid-sem','end-sem']).optional()});
export const facultyAdminQuerySchema=query({page,limit:limit(100),status:z.enum(['draft','submitted','approved','changes_requested']).optional()});
export const facultyPublicQuerySchema=query({limit:limit(50),q:z.string().trim().max(80).optional()});
export const placementAdminQuerySchema=query({page,limit:limit(100)});
export const emptyQuerySchema=query({});

export const publicFacultyParamsSchema=z.object({params:z.object({facultyId:z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,30}$/)}),query:z.object({preview:z.enum(['0','1']).optional()}).strict()});
