import { z } from 'zod';

const baseBody=z.object({
  resourceType:z.enum(['syllabus','timetable','academic-calendar']), programme:z.enum(['ug-cse','pg-cse','institute-wide']),
  semester:z.number().int().min(1).max(8).nullable().optional(), academicYear:z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
  term:z.enum(['odd','even','annual']).nullable().optional(), title:z.string().trim().min(2).max(200),
  documentUrl:z.url().refine((value)=>new URL(value).protocol==='https:','Document URL must use HTTPS'),
  status:z.enum(['draft','published']).default('draft'),isCurrent:z.boolean().default(false)
});
const body=baseBody.superRefine((value,context)=>{
  if(value.resourceType==='academic-calendar'&&(value.programme!=='institute-wide'||value.semester!=null))context.addIssue({code:'custom',message:'Calendar must be institute-wide without semester'});
  if(value.resourceType!=='academic-calendar'&&(value.programme==='institute-wide'||!value.semester))context.addIssue({code:'custom',message:'Programme and semester are required'});
  if(value.programme==='pg-cse'&&value.semester>4)context.addIssue({code:'custom',message:'PG CSE has only four semesters'});
});

export const createAcademicDocumentSchema=z.object({body});
export const updateAcademicDocumentSchema=z.object({params:z.object({id:z.string().regex(/^[a-f\d]{24}$/i)}),body:baseBody.partial().refine((value)=>Object.keys(value).length>0,'At least one field is required')});
export const academicDocumentIdSchema=z.object({params:z.object({id:z.string().regex(/^[a-f\d]{24}$/i)})});
