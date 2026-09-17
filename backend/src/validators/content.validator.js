import { z } from 'zod';
import { CONTENT_TYPES } from '../constants/roles.js';

const asset = z.object({
  provider:z.enum(['cloudinary','gridfs']).optional(),key:z.string().min(1),publicId:z.string().min(1).optional(),
  url:z.url(),originalUrl:z.url().optional(),name:z.string().min(1),mimeType:z.string().min(1),
  size:z.number().int().positive().max(25*1024*1024),width:z.number().int().positive().optional(),
  height:z.number().int().positive().optional(),format:z.string().max(20).optional()
}).optional();
const content = z.object({ type:z.enum(CONTENT_TYPES), title:z.string().trim().min(2).max(250), category:z.string().max(80).optional(), summary:z.string().trim().max(240).optional(), body:z.string().trim().max(50_000).optional(), displayDate:z.coerce.date().optional(), featured:z.boolean().optional(), asset, status:z.enum(['draft','published']).optional() });
export const createContentSchema=z.object({body:content.superRefine((value,context)=>{if(value.type==='notice'&&(!value.summary||value.summary.length<5))context.addIssue({code:'custom',message:'A short notice description is required'});if(value.type==='notice'&&(!value.body||value.body.length<10))context.addIssue({code:'custom',message:'A long notice description is required'})})});
export const updateContentSchema=z.object({params:z.object({id:z.string().regex(/^[a-f\d]{24}$/i)}),body:content.partial().refine((body)=>Object.keys(body).length>0)});
export const contentIdSchema=z.object({params:z.object({id:z.string().regex(/^[a-f\d]{24}$/i)})});
