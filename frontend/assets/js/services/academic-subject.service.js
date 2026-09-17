import { apiRequest } from './api-client.js';

export const academicSubjectService={
  listPublic:(programme='')=>apiRequest(`/academic-subjects/public${programme?`?programme=${encodeURIComponent(programme)}`:''}`,{cache:'no-store'}),
  listManaged:()=>apiRequest('/academic-subjects/managed'),
  create:(subject)=>apiRequest('/academic-subjects',{method:'POST',body:JSON.stringify(subject)}),
  update:(id,subject)=>apiRequest(`/academic-subjects/${id}`,{method:'PATCH',body:JSON.stringify(subject)}),
  upload:(id,file)=>{const body=new FormData();body.append('file',file);return apiRequest(`/academic-subjects/${id}/syllabus`,{method:'POST',body})},
  publish:(id)=>apiRequest(`/academic-subjects/${id}/publish`,{method:'POST'}),
  requestChanges:(id)=>apiRequest(`/academic-subjects/${id}/request-changes`,{method:'POST'}),
  remove:(id)=>apiRequest(`/academic-subjects/${id}`,{method:'DELETE'})
};
