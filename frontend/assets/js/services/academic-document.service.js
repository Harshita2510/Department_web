import { apiRequest } from './api-client.js';

export const academicDocumentService={
  listPublic:(type='')=>apiRequest(`/academic-documents/public${type?`?type=${encodeURIComponent(type)}`:''}`),
  listAdmin:(type='')=>apiRequest(`/academic-documents${type?`?type=${encodeURIComponent(type)}`:''}`),
  create:(document)=>apiRequest('/academic-documents',{method:'POST',body:JSON.stringify(document)}),
  update:(id,document)=>apiRequest(`/academic-documents/${id}`,{method:'PATCH',body:JSON.stringify(document)}),
  remove:(id)=>apiRequest(`/academic-documents/${id}`,{method:'DELETE'})
};
