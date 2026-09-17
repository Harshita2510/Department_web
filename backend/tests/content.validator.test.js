import assert from 'node:assert/strict';
import test from 'node:test';
import { createContentSchema,updateContentSchema } from '../src/validators/content.validator.js';

const notice={type:'notice',title:'Semester examination notice',category:'Examination',summary:'Examination dates have been published.',body:'Read the complete examination schedule and instructions in the attached PDF.',asset:{provider:'gridfs',key:'507f1f77bcf86cd799439011',url:'http://localhost:5000/api/files/507f1f77bcf86cd799439011',name:'notice.pdf',mimeType:'application/pdf',size:1024},status:'draft'};

test('accepts a notice with short and long descriptions and PDF metadata',()=>{
  assert.equal(createContentSchema.safeParse({body:notice}).success,true);
});

test('rejects a notice without its homepage short description',()=>{
  assert.equal(createContentSchema.safeParse({body:{...notice,summary:''}}).success,false);
});

test('accepts a partial notice update without injecting other values',()=>{
  const result=updateContentSchema.safeParse({params:{id:'507f1f77bcf86cd799439011'},body:{summary:'A revised short description'}});
  assert.equal(result.success,true);assert.deepEqual(result.data.body,{summary:'A revised short description'});
});
