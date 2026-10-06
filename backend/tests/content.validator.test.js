import assert from 'node:assert/strict';
import test from 'node:test';
import { createContentSchema,updateContentSchema } from '../src/validators/content.validator.js';

const notice={type:'notice',title:'Semester examination notice',category:'Examination',summary:'Examination dates have been published.',body:'Read the complete examination schedule and instructions in the attached PDF.',noticeFileId:'507f1f77bcf86cd799439011',status:'draft'};

test('accepts a notice with descriptions and a GridFS file ID',()=>{
  const result=createContentSchema.safeParse({body:{...notice,showInTicker:true}});
  assert.equal(result.success,true);assert.equal(result.data.body.showInTicker,true);
});

test('rejects client-authored notice attachment metadata and unsafe URLs',()=>{
  const asset={provider:'gridfs',key:'507f1f77bcf86cd799439011',url:'javascript:alert(1)',name:'notice.pdf',mimeType:'application/pdf',size:1024};
  assert.equal(createContentSchema.safeParse({body:{...notice,asset}}).success,false);
  assert.equal(createContentSchema.safeParse({body:{...notice,noticeFileId:'not-an-object-id'}}).success,false);
});

test('accepts a notice without short or long descriptions',()=>{
  const result=createContentSchema.safeParse({body:{...notice,summary:'',body:''}});
  assert.equal(result.success,true);
});

test('accepts a partial notice update without injecting other values',()=>{
  const result=updateContentSchema.safeParse({params:{id:'507f1f77bcf86cd799439011'},body:{summary:'A revised short description'}});
  assert.equal(result.success,true);assert.deepEqual(result.data.body,{summary:'A revised short description'});
});
