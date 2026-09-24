import { apiRequest } from './api-client.js';

export const authService={
  login:(identifier,password)=>apiRequest('/auth/login',{method:'POST',body:JSON.stringify({identifier,password})}),
  me:()=>apiRequest('/auth/me'),
  logout:()=>apiRequest('/auth/logout',{method:'POST'}),
  changePassword:(currentPassword,newPassword)=>apiRequest('/auth/password',{method:'PATCH',body:JSON.stringify({currentPassword,newPassword})}),
  listFacultyAccounts:()=>apiRequest('/auth/faculty'),
  createFaculty:(fields,photo)=>{
    const body=new FormData();
    Object.entries(fields).forEach(([key,value])=>body.append(key,value));
    if(photo)body.append('file',photo);
    return apiRequest('/auth/faculty',{method:'POST',body});
  },
  resetFacultyPassword:(facultyId,temporaryPassword)=>apiRequest(`/auth/faculty/${encodeURIComponent(facultyId)}/password`,{method:'PATCH',body:JSON.stringify({temporaryPassword})}),
  setFacultyNoticePermission:(facultyId,allowed)=>apiRequest(`/auth/faculty/${encodeURIComponent(facultyId)}/notice-permission`,{method:'PATCH',body:JSON.stringify({allowed})})
};
