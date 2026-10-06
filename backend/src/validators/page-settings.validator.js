import { z } from 'zod';
import { pageSettingsDefaults } from '../models/page-settings.model.js';

const page=z.enum(Object.keys(pageSettingsDefaults));
export const pageSettingsParamsSchema=z.object({params:z.object({page}).strict()});
export const pageSettingsUpdateSchema=z.object({
  params:z.object({page}).strict(),
  body:z.record(z.string(),z.string().trim().min(1).max(2000))
});
