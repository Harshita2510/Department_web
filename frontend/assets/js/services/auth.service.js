import { apiRequest } from './api-client.js';

export const authService={
  login:(identifier,password)=>apiRequest('/auth/login',{method:'POST',body:JSON.stringify({identifier,password})}),
  me:()=>apiRequest('/auth/me'),
  logout:()=>apiRequest('/auth/logout',{method:'POST'}),
  changePassword:(currentPassword,newPassword)=>apiRequest('/auth/password',{method:'PATCH',body:JSON.stringify({currentPassword,newPassword})}),
  listFacultyAccounts:()=>apiRequest('/auth/faculty'),
  createFaculty:(facultyId,temporaryPassword)=>apiRequest('/auth/faculty',{method:'POST',body:JSON.stringify({facultyId,temporaryPassword})}),
  resetFacultyPassword:(facultyId,temporaryPassword)=>apiRequest(`/auth/faculty/${encodeURIComponent(facultyId)}/password`,{method:'PATCH',body:JSON.stringify({temporaryPassword})})
};
