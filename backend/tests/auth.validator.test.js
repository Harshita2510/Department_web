import assert from 'node:assert/strict';
import test from 'node:test';
import { facultyNoticePermissionSchema,resetFacultyPasswordSchema } from '../src/validators/auth.validator.js';

test('accepts a valid faculty temporary-password reset',()=>{
  const result=resetFacultyPasswordSchema.safeParse({params:{facultyId:'fac-001'},body:{temporaryPassword:'Temporary#2026'}});
  assert.equal(result.success,true);
  assert.equal(result.data.params.facultyId,'FAC-001');
});

test('rejects a reset password shorter than ten characters',()=>{
  const result=resetFacultyPasswordSchema.safeParse({params:{facultyId:'FAC-001'},body:{temporaryPassword:'short123'}});
  assert.equal(result.success,false);
});

test('rejects an invalid faculty ID during password reset',()=>{
  const result=resetFacultyPasswordSchema.safeParse({params:{facultyId:'FAC 001'},body:{temporaryPassword:'Temporary#2026'}});
  assert.equal(result.success,false);
});

test('accepts an explicit faculty notice-permission change',()=>{
  const result=facultyNoticePermissionSchema.safeParse({params:{facultyId:'fac-001'},body:{allowed:true}});
  assert.equal(result.success,true);assert.equal(result.data.params.facultyId,'FAC-001');
});
