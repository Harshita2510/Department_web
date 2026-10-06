import { z } from 'zod';

const objectId=z.string().regex(/^[a-f\d]{24}$/i);
const academicYear=z.string().regex(/^\d{4}-\d{2}$/).refine((value)=>{const [start,end]=value.split('-').map(Number);return end===(start+1)%100},'Academic year must contain consecutive years');
const fields={
  programme:z.enum(['ug-cse','pg-cse']),semester:z.number().int().min(1).max(8),subjectCode:z.string().trim().max(30).optional(),
  subjectName:z.string().trim().min(2).max(160),examType:z.enum(['mid-sem','end-sem']),academicYear,status:z.enum(['draft','published']).optional()
};
const validateProgramme=(value,context)=>{if(value.programme==='pg-cse'&&value.semester>4)context.addIssue({code:'custom',message:'PG CE has only four semesters'})};
export const createQuestionPaperSchema=z.object({body:z.object(fields).superRefine(validateProgramme)});
export const updateQuestionPaperSchema=z.object({params:z.object({id:objectId}),body:z.object(fields).partial().refine((value)=>Object.keys(value).length>0,'At least one field is required')});
export const questionPaperIdSchema=z.object({params:z.object({id:objectId})});
