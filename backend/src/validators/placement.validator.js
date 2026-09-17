import { z } from 'zod';

const academicYear = z.string().regex(/^\d{4}-\d{2}$/).refine((value) => {
  const [start, end] = value.split('-').map(Number);
  return (start + 1) % 100 === end;
}, 'Academic year must contain consecutive years');

const httpsUrl = z.url().refine((value) => new URL(value).protocol === 'https:', 'Sheet URL must use HTTPS');
const placementFields=z.object({academicYear,sourceType:z.enum(['link','pdf']).optional(),sheetUrl:httpsUrl.optional().or(z.literal('')),status:z.enum(['draft','published']).optional()});
export const placementBody=placementFields.superRefine((body,context)=>{
  if((body.sourceType||'link')==='link'&&!body.sheetUrl)context.addIssue({code:'custom',path:['sheetUrl'],message:'A public HTTPS sheet link is required'});
});
export const createPlacementSchema = z.object({ body: placementBody });
export const updatePlacementSchema = z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }), body: placementFields.partial().refine((body) => Object.keys(body).length > 0) });
export const placementIdSchema = z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) });
