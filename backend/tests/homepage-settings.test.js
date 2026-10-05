import assert from 'node:assert/strict';
import test from 'node:test';
import { homepageDefaults } from '../src/models/homepage-settings.model.js';
import { homepageSettingsSchema } from '../src/validators/homepage-settings.validator.js';

const request=(body)=>({body});

test('homepage defaults satisfy the administrator update contract',()=>{
  const result=homepageSettingsSchema.safeParse(request(structuredClone(homepageDefaults)));
  assert.equal(result.success,true);
});

test('homepage settings require exactly three complete highlights',()=>{
  const body=structuredClone(homepageDefaults);
  body.highlights.pop();
  assert.equal(homepageSettingsSchema.safeParse(request(body)).success,false);
});

test('homepage settings reject unknown client-controlled fields',()=>{
  const body={...structuredClone(homepageDefaults),html:'<script>alert(1)</script>'};
  assert.equal(homepageSettingsSchema.safeParse(request(body)).success,false);
});

test('homepage settings enforce bounded readable content',()=>{
  const body={...structuredClone(homepageDefaults),heroOverview:'too short'};
  assert.equal(homepageSettingsSchema.safeParse(request(body)).success,false);
});

test('homepage program outcomes can be edited or removed',()=>{
  const body=structuredClone(homepageDefaults);
  body.programOutcomes=body.programOutcomes.slice(0,2);
  assert.equal(homepageSettingsSchema.safeParse(request(body)).success,true);
  body.programOutcomes=[{code:'PO1',title:'Knowledge',description:'too short'}];
  assert.equal(homepageSettingsSchema.safeParse(request(body)).success,false);
});

test('homepage settings validate department contact links',()=>{
  const valid={...structuredClone(homepageDefaults),departmentPhone:'+91 (731) 2434095',departmentEmail:'Computer@SGSITS.ac.in'};
  const result=homepageSettingsSchema.safeParse(request(valid));
  assert.equal(result.success,true);assert.equal(result.data.body.departmentEmail,'computer@sgsits.ac.in');
  assert.equal(homepageSettingsSchema.safeParse(request({...valid,departmentPhone:'javascript:alert(1)'})).success,false);
  assert.equal(homepageSettingsSchema.safeParse(request({...valid,departmentEmail:'not-an-email'})).success,false);
});
