import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read=name=>fs.readFile(new URL('./'+name,import.meta.url),'utf8');

test('notice board uses the public user surface for authenticated management',async()=>{
  const [html,board,admin]=await Promise.all([read('index.html'),read('notice-board-v2.js'),read('admin-notices.js')]);
  assert.match(html,/name="id"/);
  assert.match(html,/notice-board-v2\.js/);
  for(const marker of ['data-board-edit','data-board-delete',"method:id?'PUT':'POST'",'/api/admin-session'])assert.match(board,new RegExp(marker.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')));
  assert.match(admin,/실제 사용자 화면/);
  assert.doesNotMatch(admin,/method:'PUT'|method:'POST'|method:'DELETE'/);
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
