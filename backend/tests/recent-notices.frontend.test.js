import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const frontend=(path)=>readFile(new URL(`../../frontend/${path}`,import.meta.url),'utf8');

test('homepage automatically presents the five newest published notices once per notice set',async()=>{
  const [html,script]=await Promise.all([frontend('index.html'),frontend('assets/js/main.js')]);
  assert.match(html,/id="recentNoticesModal"/);
  assert.match(html,/id="recentNoticeList"/);
  assert.match(html,/aria-labelledby="recentNoticesTitle"/);
  assert.match(script,/const recent=notices\.slice\(0,5\)/);
  assert.match(script,/sgsitsRecentNoticesSeen/);
  assert.match(script,/showRecentNotices\(notices\)/);
  assert.match(script,/pages\/notices\.html#notice-/);
});

test('published notices populate an announcement ticker above the homepage hero',async()=>{
  const [home,script]=await Promise.all([
    readFile(new URL('../../frontend/index.html',import.meta.url),'utf8'),
    readFile(new URL('../../frontend/assets/js/main.js',import.meta.url),'utf8')
  ]);
  assert.ok(home.indexOf('id="announcementStrip"')<home.search(/class="[^"]*\bhero\b/));
  assert.match(home,/id="announcementStrip"[^>]*hidden/);
  assert.match(script,/renderAnnouncementTicker\(notices\)/);
  assert.match(script,/notices\.filter\(\(item\)=>item\.showInTicker!==false\)/);
  assert.match(script,/strip\.hidden=false/);
  assert.match(script,/escapeCMS\(item\.title\|\|'Department notice'\)/);
});

test('notice archive explicitly sorts recent notices before older notices',async()=>{
  const script=await frontend('assets/js/pages/notices.js');
  assert.match(script,/\.sort\(\(a,b\)=>noticeTime\(b\)-noticeTime\(a\)\)/);
  assert.match(script,/bindResourceDocumentViewer\(list\)/);
  assert.match(script,/data-resource-view/);
  assert.match(script,/class="notice-action notice-download"/);
});

test('notice forms allow PDF, JPEG and PNG while descriptions remain optional',async()=>{
  const [adminScript,portalHtml,portalScript]=await Promise.all([
    readFile(new URL('../../frontend/assets/js/site-admin.js',import.meta.url),'utf8'),
    readFile(new URL('../../frontend/pages/faculty-portal.html',import.meta.url),'utf8'),
    readFile(new URL('../../frontend/assets/js/faculty-notices.js',import.meta.url),'utf8')
  ]);
  assert.match(adminScript,/application\/pdf,image\/jpeg,image\/png/);
  assert.match(adminScript,/Short description \(optional\)/);
  assert.match(portalHtml,/accept="application\/pdf,image\/jpeg,image\/png"/);
  assert.doesNotMatch(portalHtml,/id="facultyNoticeShort"[^>]*required/);
  assert.doesNotMatch(portalHtml,/id="facultyNoticeLong"[^>]*required/);
  assert.match(portalScript,/uploadNoticeAttachment\(file\)/);
});

test('public notice views do not display Academic or Student category labels',async()=>{
  const [home,homeScript,noticeScript]=await Promise.all([
    frontend('index.html'),frontend('assets/js/main.js'),frontend('assets/js/pages/notices.js')
  ]);
  const noticeSection=home.match(/<!-- NOTICE BOARD -->[\s\S]*?<\/section>/)?.[0]||'';
  assert.doesNotMatch(noticeSection,/data-notice-filter|>\s*Academic\s*<|>\s*Student\s*</);
  assert.doesNotMatch(homeScript,/data-category="\$\{category\}"|data-notice-filter/);
  assert.doesNotMatch(noticeScript,/item\.category\|\|'General'/);
});
