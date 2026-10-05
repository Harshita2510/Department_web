import mongoose from 'mongoose';
import { env } from '../config/env.js';

export function notFound(request, response) {
  response.status(404).json({ success: false, message: `Route not found: ${request.method} ${request.originalUrl}` });
}

export function errorHandler(error, request, response, _next) {
  let status = error.statusCode || 500;
  let message = error.isOperational ? error.message : 'Internal server error';
  if (error?.code === 11000) { status = 409; message = 'A record with that unique value already exists'; }
  if (String(error?.code||'').startsWith('LIMIT_')) { status=413; message='Uploaded file exceeds the allowed limit'; }
  if (error instanceof mongoose.Error.ValidationError) { status = 400; message = 'Database validation failed'; }
  if (error instanceof mongoose.Error.CastError) { status=400; message='Invalid request value'; }
  if (error instanceof SyntaxError&&error.status===400&&Object.hasOwn(error,'body')) { status=400; message='Malformed JSON request'; }
  if(status>=500){
    status=500;message='Internal server error';
    console.error('Unhandled request error',{requestId:request?.id,method:request?.method,path:request?.originalUrl,error});
  }
  const payload = { success: false, message };
  if (status<500&&error.details) payload.details = error.details;
  if (env.NODE_ENV !== 'production' && status === 500) payload.requestId=request?.id;
  response.status(status).json(payload);
}
