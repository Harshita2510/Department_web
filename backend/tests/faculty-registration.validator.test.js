import assert from 'node:assert/strict';
import test from 'node:test';
import { createFacultySchema } from '../src/validators/auth.validator.js';
import { facultyDraftSchema } from '../src/validators/faculty.validator.js';
import { env } from '../src/config/env.js';
import { FacultyProfile } from '../src/models/faculty-profile.model.js';

const valid = { facultyId:' emp-001 ', temporaryPassword:'Temporary123' };

test('registration accepts only a normalized employee number and temporary password', () => {
  const { body } = createFacultySchema.parse({ body:valid });
  assert.equal(body.facultyId, 'EMP-001');
  assert.equal(body.temporaryPassword, 'Temporary123');
  assert.deepEqual(Object.keys(body).sort(),['facultyId','temporaryPassword']);
});

for (const field of Object.keys(valid)) {
  test(`registration requires ${field}`, () => {
    const body = { ...valid }; delete body[field];
    assert.equal(createFacultySchema.safeParse({ body }).success, false);
  });
}

test('registration rejects profile fields because faculty owns profile editing', () => {
  assert.equal(createFacultySchema.safeParse({ body:{ ...valid, fullName:'Admin edit' } }).success, false);
});

test('later profile edits accept decimal experience and explicit academic fields', () => {
  assert.equal(facultyDraftSchema.safeParse({ body:{ experienceYears:3.5, highestQualification:'PhD', areaOfSpecialisation:'AI' } }).success, true);
  assert.equal(facultyDraftSchema.safeParse({ body:{ experienceYears:0 } }).success, true);
});

test('faculty profile email has no provider or format restriction', () => {
  assert.equal(facultyDraftSchema.safeParse({ body:{ email:'faculty-contact-id' } }).success, true);
  assert.equal(facultyDraftSchema.safeParse({ body:{ email:'teacher@personal.example' } }).success, true);
});

test('faculty photo accepts only this application Cloudinary upload path', () => {
  const validPhoto=`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/v123/sgsits/faculty/photo.webp`;
  assert.equal(facultyDraftSchema.safeParse({body:{photoUrl:validPhoto}}).success,Boolean(env.CLOUDINARY_CLOUD_NAME));
  assert.equal(facultyDraftSchema.safeParse({body:{photoUrl:'https://evil.example/a.png\")\" onmouseover=\"alert(1)\" x=\"'}}).success,false);
  assert.equal(facultyDraftSchema.safeParse({body:{photoUrl:'https://res.cloudinary.com/another-account/image/upload/v123/sgsits/faculty/photo.png'}}).success,false);
});

test('faculty profile model rejects a malicious photo URL even if API validation is bypassed', () => {
  const profile=new FacultyProfile({user:'507f1f77bcf86cd799439011',facultyId:'EMP-XSS',draft:{photoUrl:'https://evil.example/a.png\")\" onmouseover=\"alert(1)\" x=\"'}});
  assert.ok(profile.validateSync()?.errors['draft.photoUrl']);
});
