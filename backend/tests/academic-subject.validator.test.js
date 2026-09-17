import assert from 'node:assert/strict';
import test from 'node:test';
import { createAcademicSubjectSchema,updateAcademicSubjectSchema } from '../src/validators/academic-subject.validator.js';

test('accepts an UG subject with assigned faculty editors',()=>{
  const result=createAcademicSubjectSchema.safeParse({body:{programme:'ug-cse',semester:8,subjectCode:'CS-801',name:'Project Work',sortOrder:1,editors:['507f1f77bcf86cd799439011'],active:true}});
  assert.equal(result.success,true);
});

test('rejects a PG subject above semester four',()=>{
  const result=createAcademicSubjectSchema.safeParse({body:{programme:'pg-cse',semester:5,name:'Invalid subject'}});
  assert.equal(result.success,false);
});

test('accepts a partial subject update',()=>{
  const result=updateAcademicSubjectSchema.safeParse({params:{id:'507f1f77bcf86cd799439011'},body:{name:'Advanced Data Structures'}});
  assert.equal(result.success,true);
});
