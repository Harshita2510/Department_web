import { Placement } from '../models/placement.model.js';
import { AppError } from '../utils/app-error.js';
import { recordAudit } from '../services/audit.service.js';

export async function listPublicPlacements(_request, response) {
  const items = await Placement.find({ status:'published' })
    .sort({ academicYear:-1 })
    .select('academicYear sheetUrl status publishedAt');
  response.json({ success:true, data:items });
}

export async function listAdminPlacements(request, response) {
  const page = Math.max(1, Number(request.query.page)||1); const limit = Math.min(100,Math.max(1,Number(request.query.limit)||20));
  const [items,total] = await Promise.all([Placement.find().sort({academicYear:-1}).skip((page-1)*limit).limit(limit),Placement.countDocuments()]);
  response.json({ success:true,data:items,pagination:{page,limit,total,pages:Math.ceil(total/limit)} });
}

export async function createPlacement(request, response) {
  const item = await Placement.create({ ...request.body, createdBy:request.user.id, updatedBy:request.user.id, publishedAt:request.body.status==='published'?new Date():undefined });
  await recordAudit(request,'PLACEMENT_CREATED','Placement',item.id,{academicYear:item.academicYear,status:item.status});
  response.status(201).json({success:true,data:item});
}

export async function updatePlacement(request, response) {
  const updates={...request.body,updatedBy:request.user.id};
  if(request.body.status==='published')updates.publishedAt=new Date();
  const item=await Placement.findByIdAndUpdate(request.params.id,updates,{new:true,runValidators:true});
  if(!item)throw new AppError(404,'Placement sheet not found');
  await recordAudit(request,'PLACEMENT_UPDATED','Placement',item.id,{academicYear:item.academicYear,status:item.status});
  response.json({success:true,data:item});
}

export async function deletePlacement(request,response){
  const item=await Placement.findByIdAndDelete(request.params.id);
  if(!item)throw new AppError(404,'Placement sheet not found');
  await recordAudit(request,'PLACEMENT_DELETED','Placement',item.id,{academicYear:item.academicYear});
  response.status(204).end();
}
