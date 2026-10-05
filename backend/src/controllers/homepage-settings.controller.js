import { HomepageSettings,homepageDefaults } from '../models/homepage-settings.model.js';
import { recordAudit } from '../services/audit.service.js';
import { setPublicCache } from '../utils/public-cache.js';

function publicSettings(item){
  if(!item)return structuredClone(homepageDefaults);
  const value=item.toObject?.()||item;
  return Object.fromEntries(Object.keys(homepageDefaults).map((key)=>[key,value[key]??homepageDefaults[key]]));
}

export async function getPublicHomepageSettings(_request,response){
  const item=await HomepageSettings.findOne({key:'homepage'}).lean();
  setPublicCache(response);
  response.json({success:true,data:publicSettings(item)});
}

export async function getAdminHomepageSettings(_request,response){
  const item=await HomepageSettings.findOne({key:'homepage'}).lean();
  response.json({success:true,data:publicSettings(item)});
}

export async function updateHomepageSettings(request,response){
  const item=await HomepageSettings.findOneAndUpdate(
    {key:'homepage'},
    {$set:{...request.body,updatedBy:request.user.id},$setOnInsert:{key:'homepage'}},
    {new:true,upsert:true,runValidators:true,setDefaultsOnInsert:true}
  );
  await recordAudit(request,'HOMEPAGE_SETTINGS_UPDATED','HomepageSettings',item.id);
  response.json({success:true,data:publicSettings(item)});
}
