import { apiRequest } from './api-client.js';

export const uploadService={
  upload(file){const body=new FormData();body.append('file',file);return apiRequest('/files',{method:'POST',body})},
  uploadImage(file,folder='media'){const body=new FormData();body.append('file',file);body.append('folder',folder);return apiRequest('/files/images',{method:'POST',body})},
  uploadNoticePdf(file){const body=new FormData();body.append('file',file);return apiRequest('/files/notices',{method:'POST',body})}
};
