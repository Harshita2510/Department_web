import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publicPages=[
  'index.html',
  'pages/academic-calendar.html',
  'pages/admissions.html',
  'pages/events.html',
  'pages/faculty.html',
  'pages/laboratories.html',
  'pages/notices.html',
  'pages/placements.html',
  'pages/projects-patents.html',
  'pages/publications.html',
  'pages/question-papers.html',
  'pages/research-areas.html',
  'pages/research.html',
  'pages/syllabus.html',
  'pages/timetable.html'
];

test('public navigation places clubs under Department and removes Student Life',async()=>{
  for(const relativePath of publicPages){
    const html=await readFile(new URL(`../../frontend/${relativePath}`,import.meta.url),'utf8');
    const navigation=html.match(/<nav class="main-nav"[\s\S]*?<\/nav>/)?.[0]||'';
    assert.doesNotMatch(navigation,/Student life/i,`${relativePath} still contains Student Life`);
    assert.match(navigation,/Department[\s\S]*?Clubs &amp; [Cc]hapters/,`${relativePath} does not place Clubs under Department`);
  }
});

test('Academics exposes every student document category',async()=>{
  const home=await readFile(new URL('../../frontend/index.html',import.meta.url),'utf8');
  const academics=home.match(/<!-- Academics -->[\s\S]*?<!-- Admission -->/)?.[0]||'';
  assert.match(academics,/Syllabus/);
  assert.match(academics,/Class timetable/);
  assert.match(academics,/Exam, quiz &amp; practical timetable/);
  assert.match(academics,/Previous question papers/);
  assert.match(academics,/Academic calendar/);
});

test('public pages consistently use the Computer Engineering department name',async()=>{
  for(const relativePath of publicPages){
    const html=await readFile(new URL(`../../frontend/${relativePath}`,import.meta.url),'utf8');
    assert.doesNotMatch(html,/Computer Science(?:\s*&amp;|\s*&|\s+and)?\s*Engineering|\bCSE\b/,`${relativePath} still exposes the old department name`);
  }
  const facultyScript=await readFile(new URL('../../frontend/assets/js/pages/faculty.js',import.meta.url),'utf8');
  assert.doesNotMatch(facultyScript,/COMPUTER SCIENCE|\bCSE\b/);
});

test('administrator dashboard contains only API-backed summary cards',async()=>{
  const [html,script]=await Promise.all([
    readFile(new URL('../../frontend/pages/site-admin.html',import.meta.url),'utf8'),
    readFile(new URL('../../frontend/assets/js/site-admin.js',import.meta.url),'utf8')
  ]);
  assert.doesNotMatch(html,/Prototype storage|Browser capacity|Website settings/);
  assert.match(html,/id="homepageSettingsForm"/);
  assert.match(script,/homepageSettingsService\.getAdmin\(\)/);
  assert.match(script,/homepageSettingsService\.update\(payload\)/);
  assert.match(script,/academicSubjectService\.listManaged\(\)/);
  assert.match(script,/academicDocumentService\.listAdmin\(\)/);
  assert.match(script,/questionPaperService\.listAdmin\(\)/);
});

test('administrator sidebar follows the public website section hierarchy',async()=>{
  const html=await readFile(new URL('../../frontend/pages/site-admin.html',import.meta.url),'utf8');
  const navigation=html.match(/<nav class="cms-nav"[\s\S]*?<\/nav>/)?.[0]||'';
  const labels=['Home','Notices','Department','Academics','Admission','Research','Events','Placements'];
  let previousIndex=-1;
  for(const label of labels){
    const index=navigation.indexOf(label);
    assert.ok(index>previousIndex,`${label} is missing or out of order in the administrator sidebar`);
    previousIndex=index;
  }
  assert.match(navigation,/Department[\s\S]*?Faculty &amp; staff[\s\S]*?PhD scholars[\s\S]*?Facilities[\s\S]*?Clubs &amp; chapters/);
  assert.match(navigation,/Department[\s\S]*?Homepage content/);
  assert.match(navigation,/Academics[\s\S]*?Syllabus[\s\S]*?Previous question papers[\s\S]*?Academic calendar[\s\S]*?Class timetable[\s\S]*?Exam, quiz &amp; practical timetable/);
  assert.match(navigation,/Admission[\s\S]*?Undergraduate[\s\S]*?Postgraduate[\s\S]*?Doctoral[\s\S]*?Official admissions/);
  assert.match(navigation,/Research[\s\S]*?Research areas[\s\S]*?Publications &amp; papers[\s\S]*?Patents &amp; projects[\s\S]*?Laboratories/);
  assert.match(html,/id="dashboardPublishNotice"/);
  assert.match(html,/id="dashboardManageNotices"/);
});

test('administrator content collections refresh independently and retain published snapshots',async()=>{
  const script=await readFile(new URL('../../frontend/assets/js/site-admin.js',import.meta.url),'utf8');
  assert.match(script,/Promise\.allSettled\(Object\.values\(requests\)\)/);
  assert.match(script,/contentService\.listAdmin\(apiType\)/);
  assert.match(script,/status==='published'&&Boolean\(item\.publishedSnapshot\)/);
  assert.match(script,/Live · revision draft/);
  assert.match(script,/hasPendingPublishedRevision\?'Publish revision':'Publish'/);
  assert.doesNotMatch(script,/aria-label="Edit">\?<\/button>/);
  assert.match(script,/data-delete-id/);
  assert.match(script,/− Delete/);
});

test('administrator can manage homepage program outcomes',async()=>{
  const [html,script]=await Promise.all([
    readFile(new URL('../../frontend/pages/site-admin.html',import.meta.url),'utf8'),
    readFile(new URL('../../frontend/assets/js/site-admin.js',import.meta.url),'utf8')
  ]);
  assert.match(html,/id="homepageOutcomeEditors"/);
  assert.match(html,/id="addHomepageOutcome"/);
  assert.match(script,/programOutcomes:/);
  assert.match(script,/data-remove-homepage-outcome/);
});

test('administrator can manage department phone and email used by homepage links',async()=>{
  const [html,home,script]=await Promise.all([
    readFile(new URL('../../frontend/pages/site-admin.html',import.meta.url),'utf8'),
    readFile(new URL('../../frontend/index.html',import.meta.url),'utf8'),
    readFile(new URL('../../frontend/assets/js/main.js',import.meta.url),'utf8')
  ]);
  assert.match(html,/id="homepageDepartmentPhone"/);assert.match(html,/id="homepageDepartmentEmail"/);
  assert.match(home,/id="departmentCallLink"/);assert.match(home,/id="departmentMailLink"/);
  assert.match(script,/departmentPhoneDisplay/);assert.match(script,/departmentEmailDisplay/);
});
