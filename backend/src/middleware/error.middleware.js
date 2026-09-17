import mongoose from 'mongoose';
import { env } from '../config/env.js';

export function notFound(request, response) {
  response.status(404).json({ success: false, message: `Route not found: ${request.method} ${request.originalUrl}` });
}

export function errorHandler(error, _request, response, _next) {
  let status = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  if (error?.code === 11000) { status = 409; message = 'A record with that unique value already exists'; }
  if (String(error?.code||'').startsWith('LIMIT_')) { status=413; message='Uploaded file exceeds the allowed limit'; }
  if (error instanceof mongoose.Error.ValidationError) { status = 400; message = 'Database validation failed'; }
  const payload = { success: false, message };
  if (error.details) payload.details = error.details;
  if (env.NODE_ENV !== 'production' && status === 500) payload.stack = error.stack;
  response.status(status).json(payload);
}
