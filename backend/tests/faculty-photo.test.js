import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { facultyPhotoUrl } from '../../frontend/assets/js/shared/faculty-photo.js';
import { cloudinaryFacultyPhotoPublicId,isCloudinaryFacultyPhotoUrl } from '../src/utils/cloudinary-faculty-photo.js';

test('faculty delivery URL preserves asset/version and requests automatic format, quality and width',()=>{
  assert.equal(facultyPhotoUrl('https://res.cloudinary.com/demo/image/upload/v123/sgsits/faculty/photo.jpg',134),
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_134/v123/sgsits/faculty/photo.jpg');
});

test('faculty delivery rejects placeholders, local previews, non-image resources and other hosts',()=>{
  for(const value of ['', 'data:image/png;base64,AA', 'blob:http://localhost/photo','/assets/photo.jpg','https://example.org/photo.jpg','https://res.cloudinary.com/demo/raw/upload/document.pdf']){
    assert.equal(facultyPhotoUrl(value,380),'');
  }
});

test('faculty delivery caps width at the stored maximum',()=>{
  assert.match(facultyPhotoUrl('https://res.cloudinary.com/demo/image/upload/v1/sgsits/faculty/photo.jpg',1600),/w_800\//);
});

test('faculty photo URL rejects attribute injection and URLs outside the configured Cloudinary account',()=>{
  const attack='https://evil.example/a.png\")\" onmouseover=\"alert(1)\" x=\"';
  assert.equal(facultyPhotoUrl(attack,134),'');
  assert.equal(isCloudinaryFacultyPhotoUrl(attack,'department-cloud'),false);
  assert.equal(isCloudinaryFacultyPhotoUrl('https://res.cloudinary.com/other-cloud/image/upload/v1/sgsits/faculty/photo.png','department-cloud'),false);
  assert.equal(isCloudinaryFacultyPhotoUrl('https://res.cloudinary.com/department-cloud/image/upload/v1/sgsits/faculty/photo.png','department-cloud'),true);
});

test('faculty photo URL safely resolves the Cloudinary public ID used for deletion',()=>{
  assert.equal(
    cloudinaryFacultyPhotoPublicId('https://res.cloudinary.com/department-cloud/image/upload/v123/sgsits/faculty/profile_ab12.jpg','department-cloud'),
    'sgsits/faculty/profile_ab12'
  );
  assert.equal(cloudinaryFacultyPhotoPublicId('https://res.cloudinary.com/other/image/upload/v123/sgsits/faculty/profile.jpg','department-cloud'),'');
  assert.equal(cloudinaryFacultyPhotoPublicId('https://res.cloudinary.com/department-cloud/image/upload/v123/sgsits/faculty/%2e%2e.jpg','department-cloud'),'');
});

test('faculty photo uploads persist the Cloudinary public ID and removal calls the API',async()=>{
  const [controller,portal,service]=await Promise.all([
    readFile(new URL('../src/controllers/file.controller.js',import.meta.url),'utf8'),
    readFile(new URL('../../frontend/assets/js/faculty-portal.js',import.meta.url),'utf8'),
    readFile(new URL('../../frontend/assets/js/services/upload.service.js',import.meta.url),'utf8')
  ]);
  assert.match(controller,/draft\.photoPublicId/);
  assert.match(controller,/deleteCloudinaryImage/);
  assert.match(portal,/deleteFacultyPhoto\(\)/);
  assert.match(service,/method:'DELETE'/);
});

test('admin faculty cards never interpolate photo URLs into HTML style attributes',async()=>{
  const source=await readFile(new URL('../../frontend/assets/js/site-admin.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/style=.[^\n]*facultyPhotoUrl|background-image:url/);
  assert.match(source,/\.style\.backgroundImage=/);
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
