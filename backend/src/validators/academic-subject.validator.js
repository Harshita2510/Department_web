import { z } from 'zod';

const objectId=z.string().regex(/^[a-f\d]{24}$/i);
const subjectFields=z.object({
  programme:z.enum(['ug-cse','pg-cse']),semester:z.number().int().min(1).max(8),
  subjectCode:z.string().trim().max(30).optional().default(''),name:z.string().trim().min(2).max(160),
  sortOrder:z.number().int().min(0).max(999).optional().default(0),editors:z.array(objectId).max(30).optional().default([]),
  active:z.boolean().optional().default(true)
});
const subjectBody=subjectFields.superRefine((value,context)=>{
  if(value.programme==='pg-cse'&&value.semester>4)context.addIssue({code:'custom',path:['semester'],message:'PG CSE has only four semesters'});
});

export const createAcademicSubjectSchema=z.object({body:subjectBody});
export const updateAcademicSubjectSchema=z.object({params:z.object({id:objectId}),body:subjectFields.partial().refine((body)=>Object.keys(body).length>0,'At least one field is required')});
export const academicSubjectIdSchema=z.object({params:z.object({id:objectId})});
export const syllabusUploadSchema=z.object({params:z.object({id:objectId}),body:z.object({})});
