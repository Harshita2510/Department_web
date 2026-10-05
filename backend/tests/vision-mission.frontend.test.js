import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('homepage shows the complete department vision and mission without expansion',async()=>{
  const html=await readFile(new URL('../../frontend/index.html',import.meta.url),'utf8');
  const section=html.match(/<section class="section departments-section"[\s\S]*?<\/section>/)?.[0]||'';
  const mission=section.match(/<ol class="mission-commitments"[^>]*>[\s\S]*?<\/ol>/)?.[0]||'';
  assert.match(section,/Our vision/);
  assert.match(section,/Our mission/);
  assert.equal((mission.match(/<li>/g)||[]).length,4);
  assert.doesNotMatch(section,/extra-department|departmentToggle/);
  assert.match(section,/To become a centre of excellence for creating competent human resource/);
  assert.match(section,/blend of theoretical knowledge and practical skills/);
  assert.match(section,/promote spirit of entrepreneurship/);
  assert.match(section,/continuous learning towards sustainable development/);
  assert.match(section,/id="programOutcomesTitle"/);
  assert.equal((section.match(/<span>PO\d+<\/span>/g)||[]).length,12);
  assert.match(section,/Engineering knowledge/);
  assert.match(section,/Life-long learning/);
});
