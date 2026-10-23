import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync(new URL('./migrations/supabase/20261024_cgma_ai_education_roster_scoped_google.sql',import.meta.url),'utf8');
const roster=readFileSync(new URL('./programs/ai-marketing-2026/manage/app.js',import.meta.url),'utf8');
const normal=readFileSync(new URL('./cgma-programs.js',import.meta.url),'utf8');

test('single verified email grants only narrow roster authority',()=>{
  assert.match(migration,/values \('dlaehd12345619@gmail\.com', true\)/);
  assert.match(migration,/u\.id = auth\.uid\(\)/);
  assert.match(migration,/u\.email_confirmed_at is not null/);
  assert.match(migration,/u\.deleted_at is null/);
  assert.match(migration,/not coalesce\(u\.is_anonymous,false\)/);
  assert.match(migration,/auth\.identities/);
  assert.match(migration,/cgma_ai_edu_2026_roster_allowlist enable row level security/);
  assert.match(migration,/revoke all on private\.cgma_ai_edu_2026_roster_allowlist/);
  assert.doesNotMatch(migration,/\bgrant\s+.+?\bto\s+authenticated|update\s+public\.tenant_memberships|update\s+auth\.users/i);
});
test('roster authorization uses existing two narrow RPCs only',()=>{
  assert.match(migration,/private\.cgma_ai_edu_2026_is_roster_manager\(\) then return 'ok'/);
  assert.match(migration,/actor_kind.*roster_manager/s);
  assert.match(migration,/cgma_ai_edu_2026_admin_update/);
  assert.doesNotMatch(migration,/create or replace function public\.cgma_is_site_admin|alter role/i);
  assert.match(roster,/hasScopedRosterAccess/);
  assert.match(roster,/cgma_ai_edu_2026_admin_list/);
  assert.match(roster,/if\(!P\.token\?\.\(\)\)return false/);
  assert.doesNotMatch(roster,/cgma-can-manage[^\n]*roster_manager/);
  assert.match(normal,/rpc\('cgma_is_site_admin',\{\},\{auth:true\}\)/);
});
test('password route stays separate and no credential is stored in browser',()=>{
  assert.doesNotMatch(roster,/dlaehd12345619|1234567890/);
  assert.doesNotMatch(roster,/\bservice_role\b|SUPABASE_SERVICE/i);
  assert.match(migration,/v_hash like '\$2%'/);
  assert.match(migration,/cgma_ai_edu_2026_admin_attempts/);
});
