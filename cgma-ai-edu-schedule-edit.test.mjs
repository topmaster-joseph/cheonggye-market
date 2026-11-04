import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const load=()=>{const w={};runInNewContext(read('programs/ai-marketing-2026/schedule.js'),{window:w});return w.CGMA_AIEDU_SCHEDULE};
const plain=v=>JSON.parse(JSON.stringify(v));

test('default schedule is 8 Fridays from 11/13 with stable session numbers',()=>{
  const S=load(),list=S.normalize(null);
  assert.deepEqual(plain(list.map(s=>s.no)),[1,2,3,4,5,6,7,8]);
  assert.deepEqual(plain(list.map(S.label)),['11/13 금','11/20 금','11/27 금','12/4 금','12/11 금','12/18 금','12/25 금','1/1 금']);
  assert.equal(S.period(list),'11.13 – 1.1 · 매주 금 · 8회');
  assert.equal(S.uniformTime(list),'오후 2~4시');
  assert.equal(S.longLabel(list[0]),'11월 13일(금)');
});

test('server sessions override dates/times by session number; malformed input falls back',()=>{
  const S=load();
  const server=S.normalize(null).map(s=>s.no===3?{...s,date:'2026-12-02',start:'10:00',end:'12:00'}:s);
  const list=S.normalize(server.reverse());
  assert.equal(S.label(list[2]),'12/2 수');
  assert.equal(S.weekdayText(list),'');
  assert.equal(S.uniformTime(list),'');
  assert.equal(S.timeText(list[2]),'오전 10시~오후 12시');
  assert.equal(S.normalize([{no:1}]).length,8);
  assert.equal(S.normalize([{no:1,date:'bad'}]).length,8);
});

test('migration adds narrow, audited, authenticated-only schedule RPC',()=>{
  const sql=read('migrations/supabase/20261104_cgma_ai_edu_sessions_editable.sql');
  assert.match(sql,/add column if not exists sessions jsonb/);
  assert.match(sql,/cgma_ai_edu_2026_admin_sessions\(p_sessions jsonb/);
  assert.match(sql,/if not \(public\.cgma_is_site_admin\(\) or private\.cgma_ai_edu_2026_is_roster_manager\(\)\)/);
  assert.match(sql,/insert into public\.cgma_admin_audit/);
  assert.match(sql,/revoke all on function public\.cgma_ai_edu_2026_admin_sessions\(jsonb,text\) from public, anon, authenticated/);
  assert.match(sql,/grant execute on function public\.cgma_ai_edu_2026_admin_sessions\(jsonb,text\) to authenticated;/);
  assert.doesNotMatch(sql,/admin_sessions\(jsonb,text\) to anon/);
});

test('both pages load the shared schedule and expose in-place editing',()=>{
  const pub=read('programs/ai-marketing-2026/index.html'),man=read('programs/ai-marketing-2026/manage/index.html');
  assert.match(pub,/schedule\.js\?v=[^"]+"><\/script>\s*<script src="\.\/app\.js/);
  assert.match(man,/\.\.\/schedule\.js\?v=[^"]+"><\/script>\s*<script src="\.\/app\.js/);
  assert.match(pub,/id="sched-edit" hidden/);
  const app=read('programs/ai-marketing-2026/app.js'),mapp=read('programs/ai-marketing-2026/manage/app.js');
  assert.match(app,/cgma_ai_edu_2026_can_manage/);
  assert.match(app,/cgma_ai_edu_2026_admin_sessions/);
  assert.match(mapp,/cgma_ai_edu_2026_admin_sessions/);
  assert.doesNotMatch(app+mapp,/11월 6일|11\/6 금/);
});
