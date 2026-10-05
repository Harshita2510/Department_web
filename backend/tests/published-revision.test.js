import assert from 'node:assert/strict';
import test from 'node:test';
import { makePublishedNoticeSnapshot,publicContentVersion } from '../src/controllers/content.controller.js';
import { publicSyllabusVersion } from '../src/controllers/academic-subject.controller.js';
import { publicTimetableFiles } from '../src/controllers/academic-document.controller.js';

const gridAsset=(key)=>({provider:'gridfs',key,url:`http://untrusted/files/${key}`,name:'notice.pdf',mimeType:'application/pdf',size:100});
const cloudAsset=(publicId)=>({provider:'cloudinary',publicId,url:`https://res.cloudinary.com/demo/${publicId}`,name:`${publicId}.pdf`,mimeType:'application/pdf',size:100});

test('a pending notice revision keeps the approved notice public',()=>{
  const approved={type:'notice',title:'Approved',summary:'Approved short',body:'Approved long',showInTicker:false,status:'published',asset:gridAsset('507f1f77bcf86cd799439011')};
  const record={...approved,publishedSnapshot:makePublishedNoticeSnapshot(approved),title:'Pending',summary:'Pending short',body:'Pending long',status:'draft',asset:gridAsset('507f191e810c19729de860ea')};
  const publicValue=publicContentVersion(record);
  assert.equal(publicValue.title,'Approved');
  assert.equal(publicValue.status,'published');
  assert.equal(publicValue.asset.key,'507f1f77bcf86cd799439011');
  assert.equal(publicValue.showInTicker,false);
  assert.match(publicValue.asset.url,/\/files\/507f1f77bcf86cd799439011$/);
});

test('a pending syllabus replacement keeps the approved syllabus public',()=>{
  const approved=cloudAsset('approved-syllabus');
  const pending=cloudAsset('pending-syllabus');
  assert.equal(publicSyllabusVersion({syllabus:pending,publishedSyllabus:approved,syllabusStatus:'submitted'}),approved);
  assert.equal(publicSyllabusVersion({syllabus:pending,publishedSyllabus:null,syllabusStatus:'submitted'}),null);
});

test('a pending timetable replacement keeps each approved slot public',()=>{
  const approved=cloudAsset('approved-table');
  const pending=cloudAsset('pending-table');
  const files=publicTimetableFiles({classTable:{asset:pending,publishedAsset:approved,status:'submitted'}});
  assert.equal(files.classTable.asset,approved);
  assert.equal(files.classTable.status,'published');
  assert.equal(files.quiz,null);
});
