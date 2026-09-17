import assert from 'node:assert/strict';
import test from 'node:test';
import { createAcademicDocumentSchema,timetableSlotParamsSchema,updateAcademicDocumentSchema } from '../src/validators/academic-document.validator.js';

const facultyId='507f1f77bcf86cd799439011';

test('accepts a timetable semester with assigned faculty and no legacy URL',()=>{
  const result=createAcademicDocumentSchema.safeParse({body:{
    resourceType:'timetable',programme:'ug-cse',semester:8,academicYear:'2026-27',term:'even',
    title:'Semester 8 timetable',documentUrl:'',editors:[facultyId],status:'draft',isCurrent:true
  }});
  assert.equal(result.success,true);
});

test('rejects a PG timetable above semester four',()=>{
  const result=createAcademicDocumentSchema.safeParse({body:{
    resourceType:'timetable',programme:'pg-cse',semester:5,academicYear:'2026-27',term:'odd',title:'Invalid timetable'
  }});
  assert.equal(result.success,false);
});

test('rejects a non-consecutive timetable academic year',()=>{
  const result=createAcademicDocumentSchema.safeParse({body:{
    resourceType:'timetable',programme:'ug-cse',semester:1,academicYear:'2026-29',term:'odd',title:'Semester 1 timetable'
  }});
  assert.equal(result.success,false);
});

test('accepts an editor-only timetable update without injecting defaults',()=>{
  const result=updateAcademicDocumentSchema.safeParse({params:{id:facultyId},body:{editors:[]}});
  assert.equal(result.success,true);
  assert.deepEqual(result.data.body,{editors:[]});
});

test('validates all supported timetable upload slots',()=>{
  for(const slot of ['classTable','mst1','mst2','mst3','endSemester']){
    assert.equal(timetableSlotParamsSchema.safeParse({params:{id:facultyId,slot}}).success,true);
  }
  assert.equal(timetableSlotParamsSchema.safeParse({params:{id:facultyId,slot:'quiz'}}).success,false);
});
