import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { AppError } from '../src/utils/app-error.js';
import { errorHandler } from '../src/middleware/error.middleware.js';
import { authorize } from '../src/middleware/auth.middleware.js';
import { fileMatchesDeclaredType,verifyUploadContents } from '../src/middleware/upload.middleware.js';
import { createFacultySchema,facultyStatusSchema } from '../src/validators/auth.validator.js';
import { managedContentQuerySchema,publicSubjectQuerySchema } from '../src/validators/query.validator.js';

function responseRecorder(){
  return {statusCode:200,payload:null,status(value){this.statusCode=value;return this},json(value){this.payload=value;return this}};
}

test('unexpected server errors do not expose internal messages',()=>{
  const response=responseRecorder();const original=console.error;console.error=()=>{};
  try{errorHandler(new Error('MongoDB host and secret detail'),{id:'request-1',method:'GET',originalUrl:'/api/test'},response,()=>{});}finally{console.error=original;}
  assert.equal(response.statusCode,500);
  assert.equal(response.payload.message,'Internal server error');
  assert.doesNotMatch(JSON.stringify(response.payload),/MongoDB host|secret detail/);
});

test('operational CORS errors preserve their safe 403 response',()=>{
  const response=responseRecorder();errorHandler(new AppError(403,'Origin is not allowed by CORS'),{},response,()=>{});
  assert.equal(response.statusCode,403);assert.equal(response.payload.message,'Origin is not allowed by CORS');
});

test('authorization middleware rejects the wrong role',()=>{
  let error;authorize('admin')({user:{role:'faculty'}},null,(value)=>{error=value});
  assert.equal(error.statusCode,403);
});

test('query schemas reject repeated and non-numeric parameters',()=>{
  assert.equal(managedContentQuerySchema.safeParse({query:{type:['notice','event']}}).success,false);
  assert.equal(managedContentQuerySchema.safeParse({query:{page:'abc'}}).success,false);
  assert.equal(publicSubjectQuerySchema.safeParse({query:{semester:'abc'}}).success,false);
  assert.equal(publicSubjectQuerySchema.safeParse({query:{semester:'4',programme:'pg-cse'}}).success,true);
});

test('faculty creation and reset share the ten-character minimum',()=>{
  assert.equal(createFacultySchema.safeParse({body:{facultyId:'FAC-1',temporaryPassword:'123456789'}}).success,false);
  assert.equal(createFacultySchema.safeParse({body:{facultyId:'FAC-1',temporaryPassword:'1234567890'}}).success,true);
  assert.equal(facultyStatusSchema.safeParse({params:{facultyId:'fac-1'},body:{status:'inactive'}}).success,true);
});

test('upload content must match the declared MIME type',()=>{
  const pdf=Buffer.from('%PDF-1.7\n');const fakePdf=Buffer.from('<html>not pdf</html>');
  assert.equal(fileMatchesDeclaredType({mimetype:'application/pdf',buffer:pdf}),true);
  assert.equal(fileMatchesDeclaredType({mimetype:'application/pdf',buffer:fakePdf}),false);
  assert.equal(fileMatchesDeclaredType({mimetype:'image/png',buffer:fakePdf}),false);
  let error;verifyUploadContents({file:{mimetype:'application/pdf',buffer:fakePdf}},null,(value)=>{error=value});
  assert.equal(error.statusCode,415);
});

test('Mongoose cast errors become safe client errors',()=>{
  const response=responseRecorder();
  errorHandler(new mongoose.Error.CastError('ObjectId','not-an-id','_id'),{},response,()=>{});
  assert.equal(response.statusCode,400);assert.equal(response.payload.message,'Invalid request value');
});
