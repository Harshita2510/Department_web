import { apiRequest } from './api-client.js';

export const facultyService={
  getOwn:()=>apiRequest('/faculty/me'),
  updateOwn:(draft)=>apiRequest('/faculty/me',{method:'PATCH',body:JSON.stringify(draft)}),
  submitOwn:()=>apiRequest('/faculty/me/submit',{method:'POST'}),
  getPublic:(facultyId)=>apiRequest(`/faculty/public/${encodeURIComponent(facultyId)}`),
  list:(status='')=>apiRequest(`/faculty${status?`?status=${encodeURIComponent(status)}`:''}`),
  updateByAdmin:(id,draft)=>apiRequest(`/faculty/${id}`,{method:'PATCH',body:JSON.stringify(draft)}),
  approve:(id)=>apiRequest(`/faculty/${id}/approve`,{method:'POST'})
  ,remove:(id)=>apiRequest(`/faculty/${id}`,{method:'DELETE'})
};
