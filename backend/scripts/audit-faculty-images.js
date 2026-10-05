import { cloudinary,cloudinaryConfigured } from '../src/config/cloudinary.js';
import { env } from '../src/config/env.js';
import { connectDatabase,disconnectDatabase } from '../src/config/database.js';
import { FacultyProfile } from '../src/models/faculty-profile.model.js';
import { cloudinaryFacultyPhotoPublicId } from '../src/utils/cloudinary-faculty-photo.js';

const deleteOrphans=process.argv.includes('--delete');

async function listFacultyImages(){
  const resources=[];
  let nextCursor;
  do{
    const page=await cloudinary.api.resources({
      resource_type:'image',type:'upload',prefix:'sgsits/faculty/',max_results:500,
      ...(nextCursor?{next_cursor:nextCursor}:{})
    });
    resources.push(...page.resources);
    nextCursor=page.next_cursor;
  }while(nextCursor);
  return resources;
}

function storedPhotoIds(profile){
  return [profile.draft,profile.approvedSnapshot].flatMap((photo)=>{
    if(!photo)return [];
    const publicId=photo.photoPublicId||cloudinaryFacultyPhotoPublicId(photo.photoUrl,env.CLOUDINARY_CLOUD_NAME);
    return publicId?[publicId]:[];
  });
}

async function main(){
  if(!cloudinaryConfigured)throw new Error('Cloudinary credentials are not configured');
  await connectDatabase();
  const profiles=await FacultyProfile.find({}).select('draft.photoUrl draft.photoPublicId approvedSnapshot.photoUrl approvedSnapshot.photoPublicId').lean();
  const referenced=new Set(profiles.flatMap(storedPhotoIds));
  const resources=await listFacultyImages();
  const orphans=resources.filter((resource)=>!referenced.has(resource.public_id));

  console.log(`Faculty profiles checked: ${profiles.length}`);
  console.log(`Cloudinary faculty images: ${resources.length}`);
  console.log(`Unreferenced faculty images: ${orphans.length}`);
  for(const resource of orphans)console.log(`- ${resource.public_id}`);

  if(!deleteOrphans){
    console.log('Dry run only. Re-run with --delete after reviewing this list.');
    return;
  }
  for(const resource of orphans){
    const result=await cloudinary.uploader.destroy(resource.public_id,{resource_type:'image',invalidate:true});
    if(!['ok','not found'].includes(result.result))throw new Error(`Could not delete ${resource.public_id}: ${result.result}`);
    console.log(`Deleted ${resource.public_id}`);
  }
}

main()
  .catch((error)=>{console.error(error.message);process.exitCode=1})
  .finally(()=>disconnectDatabase());
