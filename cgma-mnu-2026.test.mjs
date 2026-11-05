import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const read=p=>readFileSync(join(root,p),'utf8');
const html=read('programs/mnu-accelerator-2026/index.html');
const app=read('programs/mnu-accelerator-2026/app.js');
const manage=read('programs/mnu-accelerator-2026/manage/index.html');
const mjs=read('programs/mnu-accelerator-2026/manage/app.js');
const sql=read('migrations/supabase/20261105_cgma_mnu_2026_applications.sql');
test('public application collects exactly three contact inputs',()=>{
  const inputs=[...html.matchAll(/<input\b[^>]*\bname="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(inputs,['store_name','name','phone']);
  assert.match(html,/id="privacy"/);
  assert.match(html,/11월 10일\(화\)/);
  assert.match(html,/forms\.gle\/QzkWsKBPiEFXWcsf7/);
  assert.match(app,/cgma_mnu_2026_apply/);
  assert.match(app,/p_privacy_ack:true/);
  assert.doesNotMatch(app,/localStorage|sessionStorage|innerHTML/);
});
test('verified original recruitment poster and course schedules are rendered',()=>{
  assert.match(html,/assets\/mnu-main\.png/);
  assert.doesNotMatch(html,/assets\/mnu-detail-[12]\.webp/);
  assert.match(html,/<section class="gallery"/);
  for(const date of ['11월 4일','11월 9일','11월 25일','11월 30일'])assert.ok(html.includes(date));
  const asset=join(root,'programs/mnu-accelerator-2026/assets/mnu-main.png');
  assert.equal(existsSync(asset),true,'Original poster must exist in the deployed repository');
  const bytes=readFileSync(asset);
  assert.equal(bytes.length,2780288);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
});
test('admin panel fails closed until checked for server authority',()=>{
  assert.match(manage,/id="content" hidden/);
  assert.match(manage,/noindex,nofollow,noarchive/);
  assert.match(mjs,/await P\.isAdmin\(\)/);
  assert.match(mjs,/cgma_mnu_2026_admin_list/);
  assert.match(mjs,/textContent=t/);
});
test('private database, consent, deadline and role-grants are enforced',()=>{
  assert.match(sql,/private\.cgma_mnu_2026_applications/);
  assert.match(sql,/cgma_is_site_admin\(\)/);
  assert.match(sql,/p_privacy_ack is distinct from true/);
  assert.match(sql,/2026-11-10 23:59:59/);
  assert.match(sql,/revoke all on private\.cgma_mnu_2026_applications/);
  assert.match(sql,/to anon,authenticated/);
  assert.match(sql,/to authenticated/);
});
test('homepage and event catalog have direct entrypoints',()=>{
  assert.match(read('index.html'),/programs\/mnu-accelerator-2026\//);
  assert.match(read('programs/index.html'),/mnu-accelerator-2026\//);
});
