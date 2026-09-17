import { apiRequest } from './api-client.js';

export const academicDocumentService={
  listPublic:(type='')=>apiRequest(`/academic-documents/public${type?`?type=${encodeURIComponent(type)}`:''}`,{cache:'no-store'}),
  listManaged:(type='')=>apiRequest(`/academic-documents/managed${type?`?type=${encodeURIComponent(type)}`:''}`),
  listAdmin:(type='')=>apiRequest(`/academic-documents${type?`?type=${encodeURIComponent(type)}`:''}`),
  create:(document)=>apiRequest('/academic-documents',{method:'POST',body:JSON.stringify(document)}),
  update:(id,document)=>apiRequest(`/academic-documents/${id}`,{method:'PATCH',body:JSON.stringify(document)}),
  uploadTimetable:(id,slot,file)=>{const body=new FormData();body.append('file',file);return apiRequest(`/academic-documents/${id}/timetable/${slot}/upload`,{method:'POST',body})},
  publishTimetable:(id,slot)=>apiRequest(`/academic-documents/${id}/timetable/${slot}/publish`,{method:'POST'}),
  deleteTimetable:(id,slot)=>apiRequest(`/academic-documents/${id}/timetable/${slot}`,{method:'DELETE'}),
  remove:(id)=>apiRequest(`/academic-documents/${id}`,{method:'DELETE'})
};
