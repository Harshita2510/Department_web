import { Placement } from '../models/placement.model.js';
import { AppError } from '../utils/app-error.js';
import { recordAudit } from '../services/audit.service.js';
import { deleteCloudinaryImage,uploadPlacementPdfAsset,verifyCloudinaryFileDelivery } from '../services/cloudinary.service.js';

function verifyPdfSignature(file){return file?.buffer?.subarray(0,5).toString()==='%PDF-'}
function placementSource(item){return item.sourceType||(item.document?'pdf':'link')}

async function assertPublishable(item){
  if(item.status!=='published')return;
  if(placementSource(item)==='link'){
    if(!item.sheetUrl)throw new AppError(400,'Add a public HTTPS placement link before publishing');
    return;
  }
  if(!item.document)throw new AppError(400,'Upload a placement PDF before publishing');
  await verifyCloudinaryFileDelivery(item.document);
}

export async function listPublicPlacements(_request, response) {
  const items = await Placement.find({ status:'published' })
    .sort({ academicYear:-1 })
    .select('academicYear sourceType sheetUrl document status publishedAt');
  response.set('Cache-Control','no-store');
  response.json({ success:true, data:items });
}

export async function listAdminPlacements(request, response) {
  const page = Math.max(1, Number(request.query.page)||1); const limit = Math.min(100,Math.max(1,Number(request.query.limit)||20));
  const [items,total] = await Promise.all([Placement.find().sort({academicYear:-1}).skip((page-1)*limit).limit(limit),Placement.countDocuments()]);
  response.json({ success:true,data:items,pagination:{page,limit,total,pages:Math.ceil(total/limit)} });
}

export async function createPlacement(request, response) {
  const item = new Placement({ ...request.body, createdBy:request.user.id, updatedBy:request.user.id });
  await assertPublishable(item);
  if(item.status==='published')item.publishedAt=new Date();
  await item.save();
  await recordAudit(request,'PLACEMENT_CREATED','Placement',item.id,{academicYear:item.academicYear,status:item.status});
  response.status(201).json({success:true,data:item});
}

export async function updatePlacement(request, response) {
  const item=await Placement.findById(request.params.id);
  if(!item)throw new AppError(404,'Placement sheet not found');
  const previousPdf=item.document?.publicId;
  Object.assign(item,request.body,{updatedBy:request.user.id});
  item.sourceType=placementSource(item);
  if(item.sourceType==='link')item.document=null;
  else item.sheetUrl='';
  await assertPublishable(item);
  item.publishedAt=item.status==='published'?(item.publishedAt||new Date()):undefined;
  await item.save();
  if(item.sourceType==='link'&&previousPdf)await deleteCloudinaryImage(previousPdf).catch(()=>{});
  await recordAudit(request,'PLACEMENT_UPDATED','Placement',item.id,{academicYear:item.academicYear,status:item.status});
  response.json({success:true,data:item});
}

export async function uploadPlacementPdf(request,response){
  const item=await Placement.findById(request.params.id);
  if(!item)throw new AppError(404,'Placement record not found');
  if(!request.file)throw new AppError(400,'Choose a placement PDF');
  if(!verifyPdfSignature(request.file))throw new AppError(415,'The uploaded file is not a valid PDF');
  const result=await uploadPlacementPdfAsset(request.file,item.academicYear);
  const previousPdf=item.document?.publicId;
  item.sourceType='pdf';item.sheetUrl='';item.status='draft';item.publishedAt=undefined;item.updatedBy=request.user.id;
  item.document={provider:'cloudinary',publicId:result.public_id,resourceType:result.resource_type,url:result.secure_url,name:request.file.originalname,mimeType:'application/pdf',size:result.bytes,format:result.format};
  await item.save();
  if(previousPdf)await deleteCloudinaryImage(previousPdf).catch(()=>{});
  await recordAudit(request,'PLACEMENT_PDF_UPLOADED','Placement',item.id,{academicYear:item.academicYear,size:result.bytes});
  response.json({success:true,data:item});
}

export async function deletePlacement(request,response){
  const item=await Placement.findByIdAndDelete(request.params.id);
  if(!item)throw new AppError(404,'Placement sheet not found');
  if(item.document?.publicId)await deleteCloudinaryImage(item.document.publicId).catch(()=>{});
  await recordAudit(request,'PLACEMENT_DELETED','Placement',item.id,{academicYear:item.academicYear});
  response.status(204).end();
}
