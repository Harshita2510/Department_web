import { apiRequest } from './api-client.js';

export const pageSettingsService={
  getPublic:(page)=>apiRequest(`/page-settings/public/${encodeURIComponent(page)}`),
  getAdmin:(page)=>apiRequest(`/page-settings/${encodeURIComponent(page)}`),
  update:(page,values)=>apiRequest(`/page-settings/${encodeURIComponent(page)}`,{method:'PATCH',body:JSON.stringify(values)})
};
