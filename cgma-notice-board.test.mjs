import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=name=>fs.readFile(new URL('./'+name,import.meta.url),'utf8');

test('notice board uses the public user surface for authenticated management',async()=>{
  const [html,board,legacy,admin,adminHtml]=await Promise.all([
    read('index.html'),
    read('notice-board-v2.js'),
    read('script.js'),
    read('admin-notices.js'),
    read('admin/index.html')
  ]);
  assert.match(html,/name="id"/);
  assert.match(html,/notice-board-v2\.js/);
  for(const marker of ['data-board-edit','data-board-delete',"method:id?'PUT':'POST'",'/api/admin-session']){
    assert.ok(board.includes(marker),marker);
  }
  assert.match(board,/const adminNav=document\.querySelector\('#adminNav'\)/);
  assert.match(board,/adminNav\.hidden=!canManage/);
  assert.match(board,/editor\.hidden=false/);
  assert.match(board,/toggle\.textContent='공지 작성'/);
  assert.doesNotMatch(legacy,/\/api\/notices|data-notice-delete|function loadNotices/);
  assert.match(admin,/실제 사용자 화면/);
  assert.doesNotMatch(admin,/method:'PUT'|method:'POST'|method:'DELETE'/);
  assert.match(adminHtml,/id="openNoticeBoard"/);
  assert.doesNotMatch(adminHtml,/id="noticeAdminForm"|id="noticeAdminList"|id="addNoticeBtn"|id="quickAddNotice"/);
});

test('notice detail has a canonical refreshable route',async()=>{
  const [redirects,board]=await Promise.all([read('_redirects'),read('notice-board-v2.js')]);
  assert.match(redirects,/\/notices\/\*\s+\/index\.html\s+200/);
  assert.match(board,/\/notices\\\/\(\\d\+\)\$/);
  assert.match(board,/const permalink=id=>route\('\/notices\/'/);
});

test('visitor controls remain hidden until server-authorized admin session succeeds',async()=>{
  const board=await read('notice-board-v2.js');
  assert.match(board,/canManage=false/);
  assert.match(board,/response\.ok/);
  assert.match(board,/toggle\.hidden=!canManage/);
  assert.match(board,/Authorization:'Bearer '/);
});

test('notice API reports degraded storage as an error and missing mutations as 404',async()=>{
  const api=await read('functions/api/notices.js');
  assert.match(api,/notice_store_unavailable'\},503/);
  assert.match(api,/notice_load_failed'\},503/);
  assert.match(api,/result\?\.meta\?\.changes/);
  assert.match(api,/error:'not_found',id\},404/);
});
