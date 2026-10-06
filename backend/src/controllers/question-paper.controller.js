import { QuestionPaper } from '../models/question-paper.model.js';
import { AppError } from '../utils/app-error.js';
import { deleteCloudinaryImage,uploadQuestionPaperAsset,verifyCloudinaryFileDelivery } from '../services/cloudinary.service.js';
import { recordAudit } from '../services/audit.service.js';
import { setPublicCache } from '../utils/public-cache.js';

export async function listPublicQuestionPapers(request,response){
  const query=request.validatedQuery||request.query;
  const filter={status:'published',asset:{$ne:null}};
  for(const key of ['programme','semester','examType'])if(query[key]!==undefined)filter[key]=query[key];
  const items=await QuestionPaper.find(filter).sort({programme:1,semester:1,subjectName:1,academicYear:-1}).select('-createdBy -updatedBy').lean();
  setPublicCache(response);response.json({success:true,data:items});
}

export async function listQuestionPapers(_request,response){
  const items=await QuestionPaper.find().sort({updatedAt:-1}).lean();response.json({success:true,data:items});
}

export async function createQuestionPaper(request,response){
  const item=await QuestionPaper.create({...request.body,status:'draft',createdBy:request.user.id,updatedBy:request.user.id});
  await recordAudit(request,'QUESTION_PAPER_CREATED','QuestionPaper',item.id,{programme:item.programme,semester:item.semester});
  response.status(201).json({success:true,data:item});
}

export async function updateQuestionPaper(request,response){
  const item=await QuestionPaper.findById(request.params.id);if(!item)throw new AppError(404,'Question paper not found');
  const requestedStatus=request.body.status;delete request.body.status;
  Object.assign(item,request.body,{updatedBy:request.user.id});
  if(requestedStatus==='published'){
    if(!item.asset)throw new AppError(400,'Upload the question paper PDF before publishing');
    await verifyCloudinaryFileDelivery(item.asset);
    if(item.status!=='published')item.publishedAt=new Date();
    item.status='published';
  }else if(requestedStatus==='draft')item.status='draft';
  await item.save();
  await recordAudit(request,'QUESTION_PAPER_UPDATED','QuestionPaper',item.id,{status:item.status});response.json({success:true,data:item});
}

export async function uploadQuestionPaper(request,response){
  const item=await QuestionPaper.findById(request.params.id);if(!item)throw new AppError(404,'Question paper not found');
  if(!request.file)throw new AppError(400,'Choose a question paper PDF');
  const result=await uploadQuestionPaperAsset(request.file,`${item.programme}/semester-${item.semester}/${item.academicYear}/${item.examType}`);
  const previous=item.asset?.publicId;
  item.asset={provider:'cloudinary',publicId:result.public_id,resourceType:result.resource_type,url:result.secure_url,name:request.file.originalname,mimeType:'application/pdf',size:result.bytes,format:result.format};
  item.status='draft';item.updatedBy=request.user.id;await item.save();
  if(previous&&previous!==item.asset.publicId)await deleteCloudinaryImage(previous).catch(()=>{});
  await recordAudit(request,'QUESTION_PAPER_UPLOADED','QuestionPaper',item.id,{size:result.bytes});response.json({success:true,data:item});
}

export async function deleteQuestionPaper(request,response){
  const item=await QuestionPaper.findByIdAndDelete(request.params.id);if(!item)throw new AppError(404,'Question paper not found');
  if(item.asset?.publicId)await deleteCloudinaryImage(item.asset.publicId).catch(()=>{});
  await recordAudit(request,'QUESTION_PAPER_DELETED','QuestionPaper',item.id,{});response.status(204).end();
}
