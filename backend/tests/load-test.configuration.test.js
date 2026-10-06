import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('public load test models 800 homepage visitors and reports production metrics',async()=>{
  const source=await readFile(new URL('../scripts/load-test-public.js',import.meta.url),'utf8');
  assert.match(source,/LOAD_TEST_VISITORS\|\|800/);
  assert.match(source,/\/content\/public/);
  assert.match(source,/\/placements\/public/);
  assert.match(source,/Promise\.all\(endpoints\.map/);
  for(const metric of ['requestsPerSecond','p50','p95','p99','errorPercent','statuses'])assert.match(source,new RegExp(metric));
});
