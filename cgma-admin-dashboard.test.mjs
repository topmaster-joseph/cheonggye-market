import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html=await fs.readFile(new URL('./admin/index.html',import.meta.url),'utf8');
const css=await fs.readFile(new URL('./admin-control.css',import.meta.url),'utf8');
const js=await fs.readFile(new URL('./admin-dashboard.js',import.meta.url),'utf8');

test('CGMA admin exposes four compact workspace tabs without duplicate notice CRUD quick actions',()=>{
  for(const label of ['오늘','점포·회원','콘텐츠','현장'])assert.match(html,new RegExp('>'+label+'<'));
  assert.match(html,/id="quickAddMerchant"/);
  assert.doesNotMatch(html,/id="quickAddNotice"/);
  assert.match(html,/id="openNoticeBoard"/);
  assert.doesNotMatch(html,/id="noticeAdminForm"|id="noticeAdminList"|id="addNoticeBtn"/);
  assert.match(html,/admin-dashboard\.js\?v=20261001-tabs-fixed-sidebar-v1/);
  assert.doesNotMatch(js,/quickAddNotice|addNoticeBtn/);
});

test('desktop sidebar is fixed and never scrolls',()=>{
  assert.match(css,/@media\(min-width:801px\)[\s\S]*?\.admin-side\{position:fixed!important;[\s\S]*?height:100dvh!important;overflow:hidden!important/);
  assert.match(css,/\.admin-side nav\{overflow:hidden!important\}/);
  assert.match(css,/\.admin-main\{margin-left:268px\}/);
});

test('tab runtime preserves existing admin modules while switching visible groups',()=>{
  for(const id of ['controlTower','merchantManager','memberReview','noticeManager','resourceManager','siteModeManager','languageManager','petitionManager'])assert.match(js,new RegExp(id));
  assert.match(js,/classList\.toggle\('admin-tab-hidden'/);
  assert.match(js,/groupForTarget/);
});

test('empty review queue collapses without hiding non-empty work',()=>{
  assert.match(js,/classList\.toggle\('is-empty',Number\.isFinite\(count\)&&count===0\)/);
  assert.match(css,/\.tower-review-due\.is-empty \.tower-review-due-list\{display:none\}/);
});

test('notice operations are handed to the authenticated public user surface',async()=>{
  const [home,board,adminNotices,redirects]=await Promise.all([
    fs.readFile(new URL('./index.html',import.meta.url),'utf8'),
    fs.readFile(new URL('./notice-board-v2.js',import.meta.url),'utf8'),
    fs.readFile(new URL('./admin-notices.js',import.meta.url),'utf8'),
    fs.readFile(new URL('./_redirects',import.meta.url),'utf8')
  ]);
  assert.match(home,/notice-board-v2\.js/);
  assert.match(home,/name="id"/);
  for(const marker of ['data-board-edit','data-board-delete',"method:id?'PUT':'POST'",'/api/admin-session'])assert.ok(board.includes(marker),marker);
  assert.match(board,/toggle\.hidden=!canManage/);
  assert.match(adminNotices,/실제 사용자 화면/);
  assert.doesNotMatch(adminNotices,/method:'PUT'|method:'POST'|method:'DELETE'/);
  assert.match(redirects,/\/notices\/\*\s+\/index\.html\s+200/);
});


test('notice permalink shell preserves canonical asset and link base',async()=>{
  const home=await fs.readFile(new URL('./index.html',import.meta.url),'utf8');
  assert.match(home,/location\.hostname==='ekodi\.kr'\?'\/cgma\/':'\/'/);
  assert.doesNotMatch(home,/<\/script>\\n\s*<script src="notice-board-v2\.js/);
});


test('CGMA uses EKODI native browser verification after production deploy',async()=>{
  const workflow=await fs.readFile(new URL('./.github/workflows/cloudflare-pages-deploy.yml',import.meta.url),'utf8');
  assert.match(workflow,/native_surface_verification_desktop:/);
  assert.match(workflow,/native_surface_verification_mobile:/);
  assert.equal((workflow.match(/ekodi-background-browser-worker\.yml@main/g)||[]).length,2);
  assert.equal((workflow.match(/surface_paths:\s*\/cgma\/,\/cgma\/notices\/1/g)||[]).length,2);
  assert.match(workflow,/device_profile:\s*desktop/);
  assert.match(workflow,/device_profile:\s*mobile-portrait/);
  assert.equal((workflow.match(/needs\.deploy\.outputs\.deployed == 'true'/g)||[]).length,2);
  assert.doesNotMatch(workflow,/tinyfish|browserless|browserbase|selenium-grid/i);
});
