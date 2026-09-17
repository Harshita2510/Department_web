import { apiRequest } from './api-client.js';

export const placementService = {
  listPublic: () => apiRequest('/placements/public'),
  listAdmin: (page = 1) => apiRequest(`/placements?page=${page}`),
  create: (placement) => apiRequest('/placements', { method:'POST', body:JSON.stringify(placement) }),
  update: (id, placement) => apiRequest(`/placements/${id}`, { method:'PATCH', body:JSON.stringify(placement) }),
  uploadPdf:(id,file)=>{const body=new FormData();body.append('file',file);return apiRequest(`/placements/${id}/pdf`,{method:'POST',body})},
  remove: (id) => apiRequest(`/placements/${id}`, { method:'DELETE' })
};
