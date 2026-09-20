import { z } from 'zod';

const academicYear=z.string().regex(/^\d{4}-\d{2}$/).refine((value)=>{
  const [start,end]=value.split('-').map(Number);
  return end===(start+1)%100;
},'Academic year must contain consecutive years');

const baseBody=z.object({
  resourceType:z.enum(['syllabus','timetable','academic-calendar']), programme:z.enum(['ug-cse','pg-cse','institute-wide']),
  semester:z.number().int().min(1).max(8).nullable().optional(), academicYear:academicYear.nullable().optional(),
  term:z.enum(['odd','even','annual']).nullable().optional(), title:z.string().trim().min(2).max(200),
  documentUrl:z.literal('').or(z.url().refine((value)=>{
    const url=new URL(value);return url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname));
  },'Document URL must use HTTPS (HTTP is allowed only on localhost)')).optional(),
  editors:z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(100).optional(),
  status:z.enum(['draft','published']).optional(),isCurrent:z.boolean().optional()
});
const body=baseBody.superRefine((value,context)=>{
  if(value.resourceType==='academic-calendar'&&(value.programme!=='institute-wide'||value.semester!=null))context.addIssue({code:'custom',message:'Calendar must be institute-wide without semester'});
  if(value.resourceType!=='academic-calendar'&&(value.programme==='institute-wide'||!value.semester))context.addIssue({code:'custom',message:'Programme and semester are required'});
  if(value.resourceType!=='timetable'&&!value.documentUrl)context.addIssue({code:'custom',message:'A document URL is required'});
  if(value.programme==='pg-cse'&&value.semester>4)context.addIssue({code:'custom',message:'PG CSE has only four semesters'});
});

export const createAcademicDocumentSchema=z.object({body});
export const updateAcademicDocumentSchema=z.object({params:z.object({id:z.string().regex(/^[a-f\d]{24}$/i)}),body:baseBody.partial().refine((value)=>Object.keys(value).length>0,'At least one field is required')});
export const academicDocumentIdSchema=z.object({params:z.object({id:z.string().regex(/^[a-f\d]{24}$/i)})});
export const timetableSlotParamsSchema=z.object({params:z.object({id:z.string().regex(/^[a-f\d]{24}$/i),slot:z.enum(['classTable','mst1','mst2','mst3','endSemester'])})});
