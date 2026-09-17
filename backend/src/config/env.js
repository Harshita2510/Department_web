import { config } from 'dotenv';
import { z } from 'zod';

config({ path:new URL('../../.env',import.meta.url), quiet:true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().trim().min(1).default('sgsits_website'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  FRONTEND_ORIGIN: z.string().url(),
  API_PUBLIC_URL: z.string().url().default('http://localhost:5000/api'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().trim().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().trim().min(1).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_INITIAL_PASSWORD: z.string().min(12).optional()
}).superRefine((values, context) => {
  const credentials = [values.CLOUDINARY_CLOUD_NAME, values.CLOUDINARY_API_KEY, values.CLOUDINARY_API_SECRET];
  if (credentials.some(Boolean) && !credentials.every(Boolean)) {
    context.addIssue({ code:'custom', message:'Cloudinary cloud name, API key and API secret must be configured together', path:['CLOUDINARY_CLOUD_NAME'] });
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
