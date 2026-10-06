import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import test from 'node:test';
import { buildNoticeAsset,resolveNoticeFile,validateNoticeFileRecord } from '../src/services/notice-file.service.js';
import { noticeFileUrl } from '../../frontend/assets/js/shared/notice-file.js';

const id='507f1f77bcf86cd799439011';

test('server builds notice attachment metadata from the GridFS record',()=>{
  const file={_id:id,filename:'official.pdf',contentType:'application/pdf',length:1024,metadata:{purpose:'notice',uploadedBy:'507f1f77bcf86cd799439012'}};
  assert.equal(validateNoticeFileRecord(file),true);
  const asset=buildNoticeAsset(file,id);
  assert.deepEqual({provider:asset.provider,key:asset.key,name:asset.name,mimeType:asset.mimeType,size:asset.size},{provider:'gridfs',key:id,name:'official.pdf',mimeType:'application/pdf',size:1024});
  assert.match(asset.url,new RegExp(`/files/${id}$`));
});

test('notice file verification rejects claimed PDFs without server metadata',()=>{
  for(const file of [null,{contentType:'application/pdf',length:1,metadata:{}},{contentType:'text/html',length:1,metadata:{purpose:'notice'}},{contentType:'application/pdf',length:0,metadata:{purpose:'notice'}}]){
    assert.equal(validateNoticeFileRecord(file),false);
  }
});

test('notice attachments accept verified PDF, JPEG and PNG records',()=>{
  for(const contentType of ['application/pdf','image/jpeg','image/png']){
    const file={contentType,length:1024,metadata:{purpose:'notice'}};
    assert.equal(validateNoticeFileRecord(file),true);
    assert.equal(buildNoticeAsset({...file,filename:'notice-file'},id).mimeType,contentType);
  }
  assert.equal(validateNoticeFileRecord({contentType:'image/webp',length:1024,metadata:{purpose:'notice'}}),false);
});

test('faculty can resolve only their own upload while an administrator can review any valid notice upload',async()=>{
  const uploader='507f1f77bcf86cd799439012';
  const file={_id:new mongoose.Types.ObjectId(id),filename:'official.pdf',contentType:'application/pdf',length:1024,metadata:{purpose:'notice',uploadedBy:new mongoose.Types.ObjectId(uploader)}};
  const originalDb=mongoose.connection.db;
  mongoose.connection.db={collection:()=>({findOne:async()=>file})};
  try{
    await assert.rejects(resolveNoticeFile(id,{id:'507f1f77bcf86cd799439013',role:'faculty'}),/uploaded by your account/);
    assert.equal((await resolveNoticeFile(id,{id:uploader,role:'faculty'})).key,id);
    assert.equal((await resolveNoticeFile(id,{id:'507f1f77bcf86cd799439013',role:'admin'})).key,id);
  }finally{
    mongoose.connection.db=originalDb;
  }
});

test('frontend accepts only this API GridFS notice endpoint',()=>{
  globalThis.window={location:{href:'http://localhost:4173/pages/notices.html'}};
  const api='http://localhost:5000/api';
  assert.equal(noticeFileUrl(`${api}/files/${id}`,api),`${api}/files/${id}`);
  for(const value of [`https://evil.example/files/${id}`,`javascript:alert(1)`,`${api}/files/not-an-id`,`${api}/files/${id}?next=evil`]){
    assert.equal(noticeFileUrl(value,api),'');
  }
  delete globalThis.window;
});
