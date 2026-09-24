import assert from 'node:assert/strict';
import test from 'node:test';
import { facultyPhotoUrl } from '../../frontend/assets/js/shared/faculty-photo.js';

test('faculty delivery URL preserves asset/version and requests automatic format, quality and width',()=>{
  assert.equal(facultyPhotoUrl('https://res.cloudinary.com/demo/image/upload/v123/sgsits/faculty/photo.jpg',134),
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_134/v123/sgsits/faculty/photo.jpg');
});

test('faculty delivery leaves placeholders, local previews and other hosts unchanged',()=>{
  for(const value of ['', 'data:image/png;base64,AA', 'blob:http://localhost/photo','/assets/photo.jpg','https://example.org/photo.jpg','https://res.cloudinary.com/demo/raw/upload/document.pdf']){
    assert.equal(facultyPhotoUrl(value,380),value);
  }
});

test('faculty delivery caps width at the stored maximum',()=>{
  assert.match(facultyPhotoUrl('https://res.cloudinary.com/demo/image/upload/v1/photo.jpg',1600),/w_800\//);
});

test('incoming resizing is applied only to faculty uploads',async(t)=>{
  Object.assign(process.env,{
    NODE_ENV:'test',MONGODB_URI:'mongodb://localhost/unused',JWT_SECRET:'faculty-photo-test-secret-at-least-32-characters',
    FRONTEND_ORIGIN:'http://localhost:4173',CLOUDINARY_CLOUD_NAME:'test',CLOUDINARY_API_KEY:'test',CLOUDINARY_API_SECRET:'test'
  });
  const {cloudinary}=await import('../src/config/cloudinary.js');
  const {uploadCloudinaryImage}=await import('../src/services/cloudinary.service.js');
  const calls=[];
  t.mock.method(cloudinary.uploader,'upload_stream',(options,callback)=>{
    calls.push(options);return {end(){callback(null,{public_id:'test'})}};
  });
  for(const folder of ['faculty','events','news','media','unknown'])await uploadCloudinaryImage({buffer:Buffer.from('mock')},folder);
  assert.deepEqual(calls[0].transformation,[{width:800,height:800,crop:'limit',quality:'auto'}]);
  for(const options of calls.slice(1))assert.equal('transformation' in options,false);
});
