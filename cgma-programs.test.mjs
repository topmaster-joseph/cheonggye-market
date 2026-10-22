// CGMA-PROGRAMS-001 contract: one '행사·참여' menu, registry-driven hub, user-page management that is
// fail-closed, no privileged keys in the browser, and the AI 교육 신청 page wired to the single source.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const home=read('index.html'),js=read('cgma-programs.js'),hub=read('programs/index.html');
const edu=read('programs/ai-marketing-2026/index.html'),eduJs=read('programs/ai-marketing-2026/app.js');
const admin=read('admin/index.html'),inline=read('cgma-inline-management.js'),sql=read('migrations/supabase/20261022_cgma_programs_registry.sql');

test('top menu carries one stable 행사·참여 entry instead of one link per event',()=>{
  const nav=home.match(/<nav id="nav"[\s\S]*?<\/nav>/)[0];
  assert.match(nav,/<a href="programs\/" class="nav-programs">행사·참여<\/a>/);
  assert.doesNotMatch(nav,/festival\/2026\/apply\/|festival\/2026\/coupon\/|ai-education\//);
});

test('home strip is registry-driven with a static read-only fallback; festival notice self-expires',()=>{
  assert.match(home,/id="cgmaProgramsStrip" data-home-only/);
  assert.match(home,/data-programs-grid>\s*<article class="cgp-card">[\s\S]*programs\/ai-marketing-2026\//);
  assert.match(home,/class="cgma-festival-alert" data-home-only data-expires="2026-10-28"/);
  assert.match(js,/function expireStatic\(\)/);
  assert.match(js,/static fallback kept/);
  assert.ok(home.indexOf('site-path.js')<home.indexOf('cgma-programs.js'),'route helper loads first');
});

test('browser code holds only the publishable key and never a service credential',()=>{
  for(const src of [js,eduJs]){
    assert.doesNotMatch(src,/service_role|SUPABASE_SERVICE|secret/i);
  }
  assert.match(js,/sb_publishable_/);
  assert.doesNotMatch(eduJs,/p_pin:\s*['"][^'"]+['"]/,'no PIN in page code');
});

test('management UI is fail-closed: only a positive DB answer opens it',()=>{
  assert.match(js,/rpc\('cgma_is_site_admin',\{\},\{auth:true\}\)\.then\(v=>v===true\)\.catch\(\(\)=>false\)/);
  assert.match(js,/if\(!admin\)\{/);
  assert.match(eduJs,/admin=await P\.isAdmin\(\);/);
  assert.match(eduJs,/else\{admin=false;panel\.innerHTML='';\}/);
});

test('rendered registry text is escaped and links are limited to site paths or https',()=>{
  assert.match(js,/const esc=v=>String\(v\?\?''\)\.replace\(\/\[&<>"'\]\/g/);
  assert.match(js,/function safeHref\(v\)\{[\s\S]*?\^https:[\s\S]*?startsWith\('\/'\)[\s\S]*?return '';/);
  assert.match(sql,/apply_url ~ '\^\(\/\[\^\\s<>"\]\*\|https:\/\/\[\^\\s<>"\]\+\)\$'/);
});

test('hub groups now / soon / past and keeps static links when the list cannot load',()=>{
  for(const g of ['now','soon','past'])assert.match(hub,new RegExp(`data-group="${g}"`));
  assert.match(hub,/data-programs-error hidden/);
  assert.match(hub,/href="ai-marketing-2026\/"/);
  assert.match(hub,/data-admin-bar hidden/);
});

test('AI 교육 신청 page uses the existing single source RPCs and in-page management',()=>{
  for(const fn of ['cgma_ai_edu_2026_public_stats','cgma_ai_edu_2026_apply','cgma_ai_edu_2026_lookup','cgma_ai_edu_2026_admin_list','cgma_ai_edu_2026_admin_update'])assert.ok(eduJs.includes(fn),fn);
  assert.match(edu,/<section id="manage" class="manage" hidden/);
  assert.match(edu,/id="f-privacy" name="consent_privacy" required/);
  assert.match(edu,/개인정보 수집·이용 안내 보기/);
});

test('admin console links to user-page management instead of duplicating it; member review is inline',()=>{
  assert.match(admin,/href="\.\.\/programs\/#manage">행사·활동 등록·관리 ↗/);
  assert.match(admin,/href="\.\.\/programs\/ai-marketing-2026\/#manage">AI 교육 신청현황 ↗/);
  assert.match(inline,/member:\[\['memberReview',null,'정회원 신청 승인'\]\]/);
});

test('migration is additive, RLS-closed, definer functions pin search_path and audit writes',()=>{
  const code=sql.replace(/^\s*--.*$/gm,'');
  assert.doesNotMatch(code,/\bdrop\s+table\b|\btruncate\b|\bdelete\s+from\s+public\.cgma_(?!ai_edu_2026_admin_attempts)/i);
  assert.match(sql,/alter table public\.cgma_programs enable row level security;/);
  assert.match(sql,/revoke all on public\.cgma_programs from anon, authenticated;/);
  const definers=sql.match(/security definer set search_path = ''/g)||[];
  assert.ok(definers.length>=6,'every definer function pins an empty search_path');
  assert.match(sql,/insert into public\.cgma_admin_audit/);
  assert.match(sql,/has_tenant_admin_access\('c1b26bcc-05f8-4392-b665-ec5c44008e91'::uuid\)/);
});
