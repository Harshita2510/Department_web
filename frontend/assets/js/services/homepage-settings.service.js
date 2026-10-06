import { apiRequest } from './api-client.js';

export const homepageSettingsService={
  getPublic:()=>apiRequest('/homepage/public'),
  getAdmin:()=>apiRequest('/homepage'),
  update:(settings)=>apiRequest('/homepage',{method:'PATCH',body:JSON.stringify(settings)})
};
