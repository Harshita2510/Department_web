import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const frontend=(path)=>readFile(new URL(`../../frontend/${path}`,import.meta.url),'utf8');

test('events have a dedicated public page and homepage navigation tab',async()=>{
  const [home,page,script]=await Promise.all([
    frontend('index.html'),frontend('pages/events.html'),frontend('assets/js/pages/events.js')
  ]);
  assert.match(home,/<a href="pages\/events\.html">Events<\/a>/);
  assert.match(home,/View all events/);
  assert.match(page,/id="publicEventList"/);
  assert.match(page,/id="eventSearch"/);
  assert.match(page,/id="eventCategory"/);
  assert.match(script,/listPublic\('event'\)/);
  assert.match(script,/event-\$\{escapeHtml\(item\._id\)\}/);
});

test('homepage event cards deep-link to the selected event',async()=>{
  const script=await frontend('assets/js/main.js');
  assert.match(script,/pages\/events\.html#event-\$\{encodeURIComponent\(item\._id\|\|item\.id\|\|''\)\}/);
});
