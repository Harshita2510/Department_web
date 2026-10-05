import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV='test';
process.env.MONGODB_URI='mongodb://127.0.0.1:27017/sgsits-file-access-test';
process.env.JWT_SECRET='file-access-test-secret-at-least-32-characters';
process.env.FRONTEND_ORIGIN='http://localhost:4173';

const {fileAccessDecision}=await import('../src/controllers/file.controller.js');

test('anonymous visitors can download only files referenced by published records',()=>{
  assert.deepEqual(fileAccessDecision({publishedContent:true}),{allowed:true,isPublic:true});
  assert.deepEqual(fileAccessDecision({publishedAcademicDocument:true}),{allowed:true,isPublic:true});
  assert.deepEqual(fileAccessDecision({}),{allowed:false,isPublic:false});
});

test('draft upload access is limited to its uploader and administrators',()=>{
  const uploaderId='507f1f77bcf86cd799439011';
  assert.deepEqual(fileAccessDecision({user:{id:uploaderId,role:'faculty'},uploaderId}),{allowed:true,isPublic:false});
  assert.deepEqual(fileAccessDecision({user:{id:'507f1f77bcf86cd799439012',role:'faculty'},uploaderId}),{allowed:false,isPublic:false});
  assert.deepEqual(fileAccessDecision({user:{id:'507f1f77bcf86cd799439013',role:'admin'},uploaderId}),{allowed:true,isPublic:false});
});
