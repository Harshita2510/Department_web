import { apiRequest } from './api-client.js';

export const placementService = {
  listPublic: () => apiRequest('/placements/public'),
  listAdmin: (page = 1) => apiRequest(`/placements?page=${page}`),
  create: (placement) => apiRequest('/placements', { method:'POST', body:JSON.stringify(placement) }),
  update: (id, placement) => apiRequest(`/placements/${id}`, { method:'PATCH', body:JSON.stringify(placement) }),
  remove: (id) => apiRequest(`/placements/${id}`, { method:'DELETE' })
};
