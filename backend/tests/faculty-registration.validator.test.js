import assert from 'node:assert/strict';
import test from 'node:test';
import { createFacultySchema } from '../src/validators/auth.validator.js';
import { facultyDraftSchema } from '../src/validators/faculty.validator.js';

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
