import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('crash handlers request a non-zero process exit',async()=>{
  const source=await readFile(new URL('../src/server.js',import.meta.url),'utf8');
  assert.match(source,/shutdown\('unhandledRejection',1\)/);
  assert.match(source,/shutdown\('uncaughtException',1\)/);
  assert.match(source,/process\.exit\(exitCode\)/);
});

test('academic calendar replacement runs inside a transaction after the target is loaded',async()=>{
  const source=await readFile(new URL('../src/controllers/academic-document.controller.js',import.meta.url),'utf8');
  const update=source.slice(source.indexOf('export async function updateAcademicDocument'),source.indexOf('export async function uploadTimetable'));
  assert.match(update,/withTransaction/);
  assert.ok(update.indexOf('findById')<update.indexOf('updateMany'));
  assert.match(update,/item\.resourceType==='academic-calendar'&&item\.isCurrent/);
});
