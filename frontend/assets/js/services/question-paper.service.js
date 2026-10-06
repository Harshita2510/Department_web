import { apiRequest } from './api-client.js';

export const questionPaperService={
  listPublic:(filters={})=>{const query=new URLSearchParams(Object.entries(filters).filter(([,value])=>value!==''&&value!=null));return apiRequest(`/question-papers/public${query.size?`?${query}`:''}`,{cache:'no-store'})},
  listAdmin:()=>apiRequest('/question-papers'),
  create:(data)=>apiRequest('/question-papers',{method:'POST',body:JSON.stringify(data)}),
  update:(id,data)=>apiRequest(`/question-papers/${id}`,{method:'PATCH',body:JSON.stringify(data)}),
  upload:(id,file)=>{const body=new FormData();body.append('file',file);return apiRequest(`/question-papers/${id}/upload`,{method:'POST',body})},
  remove:(id)=>apiRequest(`/question-papers/${id}`,{method:'DELETE'})
};
