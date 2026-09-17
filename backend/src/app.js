import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';

export const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());

const developmentHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);
function isAllowedOrigin(origin) {
  if (!origin || origin === env.FRONTEND_ORIGIN) return true;
  if (env.NODE_ENV !== 'development') return false;

  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && url.port === '4173' && developmentHosts.has(url.hostname);
  } catch {
    return false;
  }
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials:true,
  methods:['GET','POST','PATCH','DELETE']
}));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit:'1mb' }));
app.use(express.urlencoded({ extended:false, limit:'1mb' }));
app.use(morgan(env.NODE_ENV==='production'?'combined':'dev'));
app.use('/api', rateLimit({ windowMs:15*60*1000, limit:300, standardHeaders:'draft-8', legacyHeaders:false }), apiRouter);
app.use(notFound);
app.use(errorHandler);
