import { PageSettings,pageSettingsDefaults } from '../models/page-settings.model.js';
import { AppError } from '../utils/app-error.js';
import { recordAudit } from '../services/audit.service.js';
import { setPublicCache } from '../utils/public-cache.js';

function normalized(page,item){
  const defaults=pageSettingsDefaults[page];
  const stored=item?.values instanceof Map?Object.fromEntries(item.values):item?.values||{};
  return Object.fromEntries(Object.keys(defaults).map((key)=>[key,stored[key]||defaults[key]]));
}
function validateKeys(page,values){
  const allowed=new Set(Object.keys(pageSettingsDefaults[page]));
  const unexpected=Object.keys(values).filter((key)=>!allowed.has(key));
  const missing=[...allowed].filter((key)=>!values[key]?.trim());
  if(unexpected.length||missing.length)throw new AppError(400,'Invalid page settings fields',{unexpected,missing});
  if(page==='admission'){
    let officialUrl;
    try{officialUrl=new URL(values.officialUrl)}catch{throw new AppError(400,'Official admissions link must be a valid HTTPS URL')}
    if(officialUrl.protocol!=='https:')throw new AppError(400,'Official admissions link must use HTTPS');
  }
}
export async function getPublicPageSettings(request,response){
  const item=await PageSettings.findOne({page:request.params.page}).lean();
  setPublicCache(response);response.json({success:true,data:normalized(request.params.page,item)});
}
export async function getAdminPageSettings(request,response){
  const item=await PageSettings.findOne({page:request.params.page}).lean();
  response.json({success:true,data:normalized(request.params.page,item)});
}
export async function updatePageSettings(request,response){
  validateKeys(request.params.page,request.body);
  const item=await PageSettings.findOneAndUpdate({page:request.params.page},{$set:{values:request.body,updatedBy:request.user.id},$setOnInsert:{page:request.params.page}},{new:true,upsert:true,runValidators:true});
  await recordAudit(request,'PAGE_SETTINGS_UPDATED','PageSettings',item.id);
  response.json({success:true,data:normalized(request.params.page,item)});
}
