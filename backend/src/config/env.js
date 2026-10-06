import { config } from 'dotenv';
import { z } from 'zod';
import { parseTrustedProxyCidrs } from '../utils/trusted-proxies.js';

// env.js is in backend/src/config, while the private environment file lives
// at backend/.env. Two parent traversals resolve that file reliably whether
// the API is started from the repository root or from the backend workspace.
config({ path:new URL('../../.env',import.meta.url), quiet:true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().trim().min(1).default('sgsits_website'),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().int().min(0).max(100).default(2),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(1).max(200).default(20),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(5000),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  FRONTEND_ORIGIN: z.string().url(),
  TRUSTED_PROXY_CIDRS: z.string().trim().default('').refine((value)=>{
    try{parseTrustedProxyCidrs(value);return true}catch{return false}
  },'Use a comma-separated list of exact proxy IP addresses or CIDR ranges'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:5000/api'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(300000),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(100).default(10000),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(3).default(10),
  REDIS_URL: z.preprocess((value)=>value===''?undefined:value,z.string().url().optional()),
  PUBLIC_CACHE_MAX_AGE_SECONDS: z.coerce.number().int().min(0).default(0),
  PUBLIC_CACHE_SHARED_MAX_AGE_SECONDS: z.coerce.number().int().min(0).default(30),
  PUBLIC_CACHE_STALE_SECONDS: z.coerce.number().int().min(0).default(120),
  HTTP_KEEP_ALIVE_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(65000),
  HTTP_HEADERS_TIMEOUT_MS: z.coerce.number().int().min(2000).max(121000).default(66000),
  HTTP_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(5000).max(300000).default(30000),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1000).max(60000).default(10000),
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
  if(values.MONGODB_MIN_POOL_SIZE>values.MONGODB_MAX_POOL_SIZE){
    context.addIssue({code:'custom',message:'MongoDB minimum pool size cannot exceed maximum pool size',path:['MONGODB_MIN_POOL_SIZE']});
  }
  if(values.HTTP_HEADERS_TIMEOUT_MS<=values.HTTP_KEEP_ALIVE_TIMEOUT_MS){
    context.addIssue({code:'custom',message:'HTTP headers timeout must be greater than keep-alive timeout',path:['HTTP_HEADERS_TIMEOUT_MS']});
  }
  if(values.NODE_ENV==='production'&&!values.REDIS_URL){
    context.addIssue({code:'custom',message:'A shared Redis/Valkey service is required in production',path:['REDIS_URL']});
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
