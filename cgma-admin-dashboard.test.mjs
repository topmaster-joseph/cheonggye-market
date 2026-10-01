import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const html=await fs.readFile(new URL('./admin/index.html',import.meta.url),'utf8');
const css=await fs.readFile(new URL('./admin-control.css',import.meta.url),'utf8');
const js=await fs.readFile(new URL('./admin-dashboard.js',import.meta.url),'utf8');

test('CGMA admin exposes four compact workspace tabs and quick actions',()=>{
  for(const label of ['오늘','점포·회원','콘텐츠','현장'])assert.match(html,new RegExp('>'+label+'<'));
  assert.match(html,/id="quickAddMerchant"/);
  assert.match(html,/id="quickAddNotice"/);
  assert.match(html,/admin-dashboard\.js\?v=20261001-tabs-fixed-sidebar-v1/);
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