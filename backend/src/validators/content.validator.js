import { z } from 'zod';
import { CONTENT_TYPES } from '../constants/roles.js';

const asset = z.object({
  provider:z.enum(['cloudinary','gridfs']).optional(),key:z.string().min(1),publicId:z.string().min(1).optional(),
  url:z.url(),originalUrl:z.url().optional(),name:z.string().min(1),mimeType:z.string().min(1),
  size:z.number().int().positive().max(25*1024*1024),width:z.number().int().positive().optional(),
  height:z.number().int().positive().optional(),format:z.string().max(20).optional()
}).optional();
const content = z.object({ type:z.enum(CONTENT_TYPES), title:z.string().trim().min(2).max(250), category:z.string().max(80).optional(), summary:z.string().max(500).optional(), body:z.string().max(50_000).optional(), displayDate:z.coerce.date().optional(), featured:z.boolean().optional(), asset, status:z.enum(['draft','published']).default('draft') });
export const createContentSchema=z.object({body:content});
export const updateContentSchema=z.object({params:z.object({id:z.string().regex(/^[a-f\d]{24}$/i)}),body:content.partial().refine((body)=>Object.keys(body).length>0)});
export const contentIdSchema=z.object({params:z.object({id:z.string().regex(/^[a-f\d]{24}$/i)})});
