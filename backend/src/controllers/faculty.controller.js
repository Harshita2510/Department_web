import { FacultyProfile } from '../models/faculty-profile.model.js';
import { User } from '../models/user.model.js';
import { AppError } from '../utils/app-error.js';
import { recordAudit } from '../services/audit.service.js';

export async function getOwnProfile(request, response) {
  const profile = await FacultyProfile.findOne({ user:request.user.id });
  if (!profile) throw new AppError(404, 'Faculty profile not found');
  response.json({ success:true, data:profile });
}

export async function updateOwnProfile(request, response) {
  const fields=Object.fromEntries(Object.entries(request.body).map(([key,value])=>[`draft.${key}`,value]));
  const profile = await FacultyProfile.findOneAndUpdate({ user:request.user.id }, { $set:{ ...fields, reviewStatus:'draft' }, $unset:{ submittedAt:1 } }, { new:true, runValidators:true });
  if (!profile) throw new AppError(404, 'Faculty profile not found');
  response.json({ success:true, data:profile });
}

export async function submitOwnProfile(request, response) {
  const profile = await FacultyProfile.findOneAndUpdate({ user:request.user.id }, { reviewStatus:'submitted', submittedAt:new Date() }, { new:true });
  if (!profile) throw new AppError(404, 'Faculty profile not found');
  await recordAudit(request, 'FACULTY_PROFILE_SUBMITTED', 'FacultyProfile', profile.id);
  response.json({ success:true, data:profile });
}

export async function listFaculty(request, response) {
  const page = Math.max(1, Number(request.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20));
  const filter = request.query.status ? { reviewStatus:request.query.status } : {};
  const [items,total] = await Promise.all([FacultyProfile.find(filter).sort({ updatedAt:-1 }).skip((page-1)*limit).limit(limit), FacultyProfile.countDocuments(filter)]);
  response.json({ success:true, data:items, pagination:{ page,limit,total,pages:Math.ceil(total/limit) } });
}

export async function listFacultyAccessOptions(_request, response) {
  const users = await User.find({ role:'faculty', status:'active' })
    .select('_id facultyId email')
    .sort({ facultyId:1 })
    .lean();
  const profiles = await FacultyProfile.find({ user:{ $in:users.map((user)=>user._id) } })
    .select('user facultyId draft.fullName draft.designation draft.email approvedSnapshot.fullName approvedSnapshot.designation approvedSnapshot.email')
    .lean();
  const profileByUser = new Map(profiles.map((profile)=>[String(profile.user),profile]));
  const options = users.map((user)=>{
    const profile=profileByUser.get(String(user._id));
    const details=profile?.draft?.fullName?profile.draft:profile?.approvedSnapshot||profile?.draft||{};
    return {
      userId:String(user._id),
      facultyId:user.facultyId,
      fullName:details.fullName||'',
      designation:details.designation||'',
      email:details.email||user.email||''
    };
  });
  response.json({ success:true, data:options });
}

export async function approveFaculty(request, response) {
  const profile = await FacultyProfile.findById(request.params.id);
  if (!profile) throw new AppError(404, 'Faculty profile not found');
  profile.approvedSnapshot = profile.draft.toObject?.() || profile.draft;
  profile.reviewStatus = 'approved'; profile.reviewedBy = request.user.id; profile.reviewedAt = new Date(); profile.publishedAt = new Date();
  await profile.save();
  await recordAudit(request, 'FACULTY_PROFILE_APPROVED', 'FacultyProfile', profile.id);
  response.json({ success:true, data:profile });
}

export async function updateFacultyByAdmin(request,response){
  const fields=Object.fromEntries(Object.entries(request.body).map(([key,value])=>[`draft.${key}`,value]));
  const profile=await FacultyProfile.findByIdAndUpdate(request.params.id,{$set:{...fields,reviewStatus:'draft',reviewedBy:request.user.id,reviewedAt:new Date()}},{new:true,runValidators:true});
  if(!profile)throw new AppError(404,'Faculty profile not found');
  await recordAudit(request,'FACULTY_PROFILE_UPDATED_BY_ADMIN','FacultyProfile',profile.id);
  response.json({success:true,data:profile});
}

export async function deleteFaculty(request,response){
  const profile=await FacultyProfile.findByIdAndDelete(request.params.id);
  if(!profile)throw new AppError(404,'Faculty profile not found');
  await request.user.constructor.findByIdAndDelete(profile.user);
  await recordAudit(request,'FACULTY_ACCOUNT_DELETED','FacultyProfile',profile.id,{facultyId:profile.facultyId});
  response.status(204).end();
}

export async function getPublicFaculty(request, response) {
  const profile = await FacultyProfile.findOne({ facultyId:request.params.facultyId.toUpperCase(), reviewStatus:'approved' }).select('facultyId approvedSnapshot publishedAt');
  if (!profile) throw new AppError(404, 'Published faculty profile not found');
  response.json({ success:true, data:profile });
}

export async function listPublicFaculty(request, response) {
  const limit=Math.min(50,Math.max(1,Number(request.query.limit)||12));
  const query=String(request.query.q||'').trim().slice(0,80);
  const filter={reviewStatus:'approved',approvedSnapshot:{$ne:null}};
  if(query){
    const escaped=query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const match=new RegExp(escaped,'i');
    filter.$or=[
      {'approvedSnapshot.fullName':match},
      {'approvedSnapshot.designation':match},
      {'approvedSnapshot.department':match},
      {'approvedSnapshot.researchInterests':match}
    ];
  }
  const items=await FacultyProfile.find(filter)
    .sort({'approvedSnapshot.fullName':1,facultyId:1})
    .limit(limit)
    .select('facultyId approvedSnapshot.title approvedSnapshot.fullName approvedSnapshot.designation approvedSnapshot.department approvedSnapshot.photoUrl approvedSnapshot.researchInterests publishedAt')
    .lean();
  response.set('Cache-Control','no-store');
  response.json({success:true,data:items});
}
