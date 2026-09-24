import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const frontend=(path)=>readFile(new URL(`../../frontend/${path}`,import.meta.url),'utf8');

test('faculty directory is a separate page and is not rendered on the homepage',async()=>{
  const [home,page,script]=await Promise.all([
    frontend('index.html'),frontend('pages/faculty.html'),frontend('assets/js/pages/faculty.js')
  ]);
  assert.doesNotMatch(home,/id="facultyDirectory"|id="peopleSearch"/);
  assert.match(home,/href="pages\/faculty\.html">Faculty &amp; staff/);
  assert.match(page,/id="facultyDirectory"/);
  assert.match(page,/id="facultySearch"/);
  assert.match(script,/facultyService\.listPublic\(term\)/);
  assert.match(script,/faculty-profile\?facultyId=/);
});
