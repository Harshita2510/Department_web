import { apiRequest } from './api-client.js';

export const contentService={
  listPublic:(type='')=>apiRequest(`/content/public${type?`?type=${encodeURIComponent(type)}`:''}`),
  listAdmin:(type='')=>apiRequest(`/content?limit=100${type?`&type=${encodeURIComponent(type)}`:''}`),
  create:(content)=>apiRequest('/content',{method:'POST',body:JSON.stringify(content)}),
  update:(id,content)=>apiRequest(`/content/${id}`,{method:'PATCH',body:JSON.stringify(content)}),
  remove:(id)=>apiRequest(`/content/${id}`,{method:'DELETE'})
};
