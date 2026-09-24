import assert from 'node:assert/strict';
import test from 'node:test';
import { createFacultySchema } from '../src/validators/auth.validator.js';
import { facultyDraftSchema } from '../src/validators/faculty.validator.js';

const valid = { fullName:' Test Teacher ', designation:' Professor ', facultyId:' emp-001 ', experienceYears:'3.5', highestQualification:' PhD ', areaOfSpecialisation:' AI ', email:' Teacher@Example.org ', temporaryPassword:'Temporary123' };

test('registration normalizes identifiers and email, accepts decimals and optional contact', () => {
  const { body } = createFacultySchema.parse({ body:valid });
  assert.equal(body.facultyId, 'EMP-001');
  assert.equal(body.email, 'teacher@example.org');
  assert.equal(body.experienceYears, 3.5);
  assert.equal(body.fullName, 'Test Teacher');
  assert.equal(body.highestQualification, 'PhD');
  assert.equal(body.areaOfSpecialisation, 'AI');
  assert.equal(body.phone, undefined);
});

for (const field of Object.keys(valid)) {
  test(`registration requires ${field}`, () => {
    const body = { ...valid }; delete body[field];
    assert.equal(createFacultySchema.safeParse({ body }).success, false);
  });
}

for (const value of ['', ' ', 'no experience', -1, '-0.5', null, true, Infinity]) {
  test(`registration rejects invalid experience ${JSON.stringify(value)}`, () => {
    assert.equal(createFacultySchema.safeParse({ body:{ ...valid, experienceYears:value } }).success, false);
  });
}

test('invalid email and whitespace-only required profile fields are rejected', () => {
  assert.equal(createFacultySchema.safeParse({ body:{ ...valid, email:'invalid' } }).success, false);
  for (const field of ['fullName','designation','highestQualification','areaOfSpecialisation']) {
    assert.equal(createFacultySchema.safeParse({ body:{ ...valid, [field]:'  ' } }).success, false);
  }
});

test('later profile edits accept decimal experience and explicit academic fields', () => {
  assert.equal(facultyDraftSchema.safeParse({ body:{ experienceYears:3.5, highestQualification:'PhD', areaOfSpecialisation:'AI' } }).success, true);
  assert.equal(facultyDraftSchema.safeParse({ body:{ experienceYears:0 } }).success, true);
});
