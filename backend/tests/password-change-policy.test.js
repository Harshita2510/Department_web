import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { requirePasswordChanged } from '../src/middleware/auth.middleware.js';

test('temporary-password faculty accounts are blocked from the workspace',()=>{
  let error;
  requirePasswordChanged({user:{role:'faculty',mustChangePassword:true}},null,(value)=>{error=value;});
  assert.equal(error?.statusCode,403);
});

test('changed-password faculty and administrators pass the password gate',()=>{
  for(const user of [{role:'faculty',mustChangePassword:false},{role:'admin',mustChangePassword:true}]){
    let called=false;
    requirePasswordChanged({user},null,(error)=>{assert.equal(error,undefined);called=true;});
    assert.equal(called,true);
  }
});

test('every faculty workspace route applies the password-change gate',async()=>{
  const routeFiles=['content.routes.js','file.routes.js','academic-subject.routes.js','academic-document.routes.js','faculty.routes.js'];
  for(const name of routeFiles){
    const source=await readFile(new URL(`../src/routes/${name}`,import.meta.url),'utf8');
    for(const line of source.split('\n').filter((value)=>value.includes('authorize(')&&value.includes('ROLES.FACULTY'))){
      assert.match(line,/requirePasswordChanged/,`${name} is missing the gate: ${line.trim()}`);
    }
  }
});
