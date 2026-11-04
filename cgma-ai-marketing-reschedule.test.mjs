import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const dates=['11/13 금','11/20 금','11/27 금','12/2 수','12/4 금','12/11 금','12/18 금','12/23 수'];
const array='const SESSIONS=['+dates.map((d,i)=>'['+(i+1)+", '"+d+"']").join(',')+'];';
const normalized=s=>s.replaceAll(/,\s*'/g,", '");
test('public intake and private attendance use identical eight session dates',()=>{
  const a=read('programs/ai-marketing-2026/app.js');
  const b=read('programs/ai-marketing-2026/manage/app.js');
  const pattern=/const SESSIONS=\[[^\n]+\];/;
  const pub=a.match(pattern)?.[0],adm=b.match(pattern)?.[0];
  assert.ok(pub);assert.equal(pub,adm);
  for(const d of dates)assert.ok(pub.includes("'"+d+"'"),'missing '+d);
  assert.doesNotMatch(pub,/11\/6|11\/25|12\/25/);
  assert.match(a,/첫 수업은 11월 13일\(금\)입니다/);
});
test('public HTML announces eight sessions on matching weekdays and avoids Christmas',()=>{
  const html=read('programs/ai-marketing-2026/index.html');
  const rendered=[...html.matchAll(/<span class="dt">([^<]+)<\/span>/g)].map(x=>x[1]);
  assert.deepEqual(rendered,dates);
  const iso=['2026-11-13','2026-11-20','2026-11-27','2026-12-02','2026-12-04','2026-12-11','2026-12-18','2026-12-23'];
  iso.forEach((d,i)=>{
    const dow=new Date(d+'T12:00:00Z').getUTCDay();
    assert.equal(dow,dates[i].endsWith('금')?5:3,d);
  });
  assert.match(html,/11\.13 – 12\.23 · 8회/);
  assert.match(html,/4회차는 <b>수요일\(12\/2\)<\/b>, 8회차는 <b>수요일\(12\/23\)<\/b>/);
  assert.doesNotMatch(html,/11월 6일 개강|11\/6 금|12\/25/);
});
test('home, form, administrator and migration share the same date range',()=>{
  const home=read('index.html');
  const form=read('programs/ai-marketing-2026/index.html');
  const mig=read('migrations/supabase/20261104_cgma_ai_marketing_reschedule.sql');
  assert.match(home,/11\.13\(금\) – 12\.23\(수\) · 오후 2~4시/);
  assert.match(form,/11월 13일 개강/);
  assert.match(mig,/WHERE slug = 'ai-marketing-2026'\s+AND starts_on = DATE '2026-11-06'\s+AND ends_on = DATE '2026-12-18'/);
  assert.match(mig,/starts_on = DATE '2026-11-13'/);
  assert.match(mig,/ends_on = DATE '2026-12-23'/);
  assert.doesNotMatch(mig,/\bDELETE\b|\bTRUNCATE\b|\bDROP\b/i);
});
