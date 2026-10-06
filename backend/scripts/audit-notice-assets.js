import mongoose from 'mongoose';
import { connectDatabase,disconnectDatabase } from '../src/config/database.js';
import { ROLES } from '../src/constants/roles.js';
import { Content } from '../src/models/content.model.js';
import { User } from '../src/models/user.model.js';
import { noticeFileDeliveryUrl,noticeFileIdPattern,validateNoticeFileRecord } from '../src/services/notice-file.service.js';

await connectDatabase();
try{
  const notices=await Content.find({type:'notice'}).select('_id title status asset createdBy').lean();
  const creators=await User.find({_id:{$in:notices.map((notice)=>notice.createdBy)}}).select('_id role').lean();
  const roleById=new Map(creators.map((user)=>[String(user._id),user.role]));
  const findings=[];

  for(const notice of notices){
    const problems=[];
    const key=String(notice.asset?.key||'');
    if(notice.asset?.provider!=='gridfs')problems.push('provider is not gridfs');
    if(!noticeFileIdPattern.test(key))problems.push('missing or invalid GridFS file ID');
    let file=null;
    if(noticeFileIdPattern.test(key)){
      file=await mongoose.connection.db.collection('uploads.files').findOne({_id:new mongoose.Types.ObjectId(key)});
      if(!validateNoticeFileRecord(file))problems.push('GridFS file is missing or is not a verified notice attachment');
    }
    if(file&&roleById.get(String(notice.createdBy))===ROLES.FACULTY&&String(file.metadata?.uploadedBy||'')!==String(notice.createdBy)){
      problems.push('faculty creator does not own the GridFS upload');
    }
    if(noticeFileIdPattern.test(key)&&notice.asset?.url!==noticeFileDeliveryUrl(key))problems.push('stored URL is not canonical');
    if(file&&notice.asset?.mimeType!==file.contentType)problems.push('stored MIME type does not match the GridFS file');
    if(problems.length)findings.push({noticeId:String(notice._id),title:notice.title,status:notice.status,problems});
  }

  console.log(JSON.stringify({checked:notices.length,invalid:findings.length,findings},null,2));
  if(findings.length)process.exitCode=1;
}finally{
  await disconnectDatabase();
}
