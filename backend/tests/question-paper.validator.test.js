import assert from 'node:assert/strict';
import test from 'node:test';
import { QuestionPaper } from '../src/models/question-paper.model.js';
import { createQuestionPaperSchema,updateQuestionPaperSchema } from '../src/validators/question-paper.validator.js';

const id='507f1f77bcf86cd799439011';
const valid={programme:'ug-cse',semester:4,subjectCode:'CO2401',subjectName:'Operating Systems',examType:'end-sem',academicYear:'2025-26'};

test('accepts a semester-wise, subject-wise question paper',()=>{
  assert.equal(createQuestionPaperSchema.safeParse({body:valid}).success,true);
});

test('rejects PG question papers above semester four',()=>{
  assert.equal(createQuestionPaperSchema.safeParse({body:{...valid,programme:'pg-cse',semester:5}}).success,false);
});

test('status-only question paper updates do not inject metadata defaults',()=>{
  const result=updateQuestionPaperSchema.parse({params:{id},body:{status:'published'}});
  assert.deepEqual(result.body,{status:'published'});
});

test('question paper model enforces consecutive academic years',async()=>{
  const item=new QuestionPaper({...valid,academicYear:'2025-28',createdBy:id,updatedBy:id});
  await assert.rejects(item.validate(),/Academic year must contain consecutive years/);
});
