import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const frontend=(path)=>readFile(new URL(`../../frontend/${path}`,import.meta.url),'utf8');

test('quiz timetable is available to admin and faculty upload workflows',async()=>{
  const [admin,faculty]=await Promise.all([
    frontend('assets/js/site-admin-timetable.js'),
    frontend('assets/js/faculty-timetable.js')
  ]);
  assert.match(admin,/quiz:'Quiz timetable'/);
  assert.match(faculty,/quiz:'Quiz timetable'/);
  assert.match(admin,/practical:'Practical examination timetable'/);
  assert.match(faculty,/practical:'Practical examination timetable'/);
});

test('public timetable renders only programmes, semesters and slots with published files',async()=>{
  const page=await frontend('assets/js/pages/timetable.js');
  assert.match(page,/examSlots=\['quiz','practical','mst1','mst2','mst3','endSemester'\]/);
  assert.match(page,/filter\(\(document\)=>document\.programme===programme\.id&&Object\.values/);
  assert.match(page,/if\(!url\)return ''/);
  assert.doesNotMatch(page,/Not published/);
});

test('faculty is nested under Department and PhD scholars is included there',async()=>{
  const home=await frontend('index.html');
  const department=home.match(/<button type="button" aria-expanded="false">Department[\s\S]*?<\/div>\s*<\/div>/)?.[0]||'';
  assert.match(department,/Faculty &amp; staff/);
  assert.match(department,/PhD scholars/);
  assert.doesNotMatch(home,/<\/div>\s*<a href="pages\/faculty\.html">Faculty<\/a>/);
  assert.ok(home.indexOf('id="about"')<home.indexOf('id="departments"'));
  assert.match(home,/Overview &amp; Academic Mission/);
  assert.match(home,/Established in the year 1983/);
  assert.match(home,/assets\/images\/sgsits-computer-engineering-department\.jpg/);
});
