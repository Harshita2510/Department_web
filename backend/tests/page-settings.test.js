import test from 'node:test';
import assert from 'node:assert/strict';
import { pageSettingsDefaults } from '../src/models/page-settings.model.js';
import { pageSettingsUpdateSchema } from '../src/validators/page-settings.validator.js';

test('all editable public page defaults satisfy the bounded settings validator',()=>{
  for(const [page,body] of Object.entries(pageSettingsDefaults)){
    const result=pageSettingsUpdateSchema.safeParse({params:{page},body});
    assert.equal(result.success,true,`${page} defaults should be valid`);
  }
});

test('page settings reject unknown pages and excessively long content',()=>{
  assert.equal(pageSettingsUpdateSchema.safeParse({params:{page:'unknown'},body:{title:'Page'}}).success,false);
  assert.equal(pageSettingsUpdateSchema.safeParse({params:{page:'events'},body:{title:'x'.repeat(2001)}}).success,false);
});
