import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet,onRequestPost,onRequestPut,onRequestDelete} from './functions/api/schedule.js';
import {parseScheduleInput,monthRange,kstToday,validDate} from './functions/_shared/cgma-schedule.js';

// Minimal D1 binding backed by a real SQLite engine, so SQL is actually executed.
function d1(){
  const sqlite=new DatabaseSync(':memory:');
  const statement=(sql,args=[])=>({
    bind:(...next)=>statement(sql,next),
    async run(){const r=sqlite.prepare(sql).run(...args);return {meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}}},
    async all(){return {results:sqlite.prepare(sql).all(...args)}},
    async first(){return sqlite.prepare(sql).get(...args)??null}
  });
  return {prepare:sql=>statement(sql),sqlite};
}

const ADMIN='admin-token',MEMBER='member-token';
// Supabase stand-in: ADMIN passes the tenant grant, MEMBER is signed in only.
function stubSupabase(){
  const original=globalThis.fetch;
  globalThis.fetch=async(url,init={})=>{
    const auth=new Headers(init.headers).get('Authorization')||'';
    const token=auth.replace('Bearer ','');
    if(String(url).endsWith('/auth/v1/user')){
      return token===ADMIN||token===MEMBER?Response.json({email:token===ADMIN?'chair@cgma.or.kr':'member@example.com'}):new Response('no',{status:401});
    }
    if(String(url).includes('/membership-api/pending')){
      return token===ADMIN?Response.json({reviewer:{authority:'tenant'}}):new Response('forbidden',{status:403});
    }
    throw new Error('unexpected fetch '+url);
  };
  return ()=>{globalThis.fetch=original};
}

const BASE='https://cgma.or.kr/api/schedule';
const req=(method,path='',{token,body}={})=>new Request(BASE+path,{
  method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},
  body:body?JSON.stringify(body):undefined
});
const call=async(handler,request,env)=>{const res=await handler({request,env});return {status:res.status,data:await res.json(),cache:res.headers.get('Cache-Control')}};

test('validation rejects malformed dates, reversed ranges, bad links and orphan end times',()=>{
  assert.equal(parseScheduleInput({title:'',startDate:'2026-10-28'}).error,'title_required');
  assert.equal(parseScheduleInput({title:'x',startDate:'2026-02-30'}).error,'start_date_invalid');
  assert.equal(parseScheduleInput({title:'x',startDate:'2026-10-28',endDate:'2026-10-27'}).error,'end_before_start');
  assert.equal(parseScheduleInput({title:'x',startDate:'2026-01-01',endDate:'2027-03-01'}).error,'span_too_long');
  assert.equal(parseScheduleInput({title:'x',startDate:'2026-10-28',startTime:'25:00'}).error,'start_time_invalid');
  assert.equal(parseScheduleInput({title:'x',startDate:'2026-10-28',endTime:'17:00'}).error,'start_time_required');
  assert.equal(parseScheduleInput({title:'x',startDate:'2026-10-28',startTime:'17:00',endTime:'11:00'}).error,'end_before_start');
  assert.equal(parseScheduleInput({title:'x',startDate:'2026-10-28',link:'javascript:alert(1)'}).error,'link_invalid');
  const ok=parseScheduleInput({title:'  축제\n준비  ',startDate:'2026-10-28',category:'없는분류',status:'weird'});
  assert.ok(ok.ok);
  assert.equal(ok.value.title,'축제 준비');
  assert.equal(ok.value.endDate,'2026-10-28');
  assert.equal(ok.value.category,'행사');
  assert.equal(ok.value.status,'published');
});

test('month and KST helpers handle boundaries',()=>{
  assert.deepEqual(monthRange('2026-02'),{first:'2026-02-01',last:'2026-02-28'});
  assert.deepEqual(monthRange('2028-02'),{first:'2028-02-01',last:'2028-02-29'});
  assert.equal(monthRange('2026-13'),null);
  // 2026-10-19 15:30Z is already 10-20 in Seoul.
  assert.equal(kstToday(new Date('2026-10-19T15:30:00Z')),'2026-10-20');
  assert.equal(validDate('2026-10-31'),true);
  assert.equal(validDate('2026-11-31'),false);
});

test('admin creates, edits, hides and deletes; public reads only published rows',async()=>{
  const restore=stubSupabase();
  const env={cheonggye_market_notices:d1()};
  try{
    const created=await call(onRequestPost,req('POST','',{token:ADMIN,body:{
      title:'2026 누구나 두:드림 축제',category:'축제',startDate:'2026-10-28',startTime:'11:00',endTime:'17:00',
      place:'국립목포대학교 후문 및 누구나 상점',link:'https://cgma.or.kr/festival/2026/apply/'
    }}),env);
    assert.equal(created.status,201);
    const id=created.data.id;
    const multi=await call(onRequestPost,req('POST','',{token:ADMIN,body:{title:'월말 정산 주간',startDate:'2026-10-30',endDate:'2026-11-02'}}),env);
    assert.equal(multi.status,201);

    const october=await call(onRequestGet,req('GET','?month=2026-10'),env);
    assert.equal(october.status,200);
    assert.match(october.cache,/public/);
    assert.deepEqual(october.data.items.map(i=>i.title),['2026 누구나 두:드림 축제','월말 정산 주간']);
    assert.equal(october.data.items[0].startTime,'11:00');
    assert.equal('updatedBy' in october.data.items[0],false,'editor identity must not be public');
    // A range spanning two months appears in both.
    const november=await call(onRequestGet,req('GET','?month=2026-11'),env);
    assert.deepEqual(november.data.items.map(i=>i.title),['월말 정산 주간']);

    const edited=await call(onRequestPut,req('PUT','',{token:ADMIN,body:{id,title:'두:드림 축제(우천 시 실내)',startDate:'2026-10-28',status:'hidden'}}),env);
    assert.equal(edited.status,200);
    const publicAfter=await call(onRequestGet,req('GET','?month=2026-10'),env);
    assert.deepEqual(publicAfter.data.items.map(i=>i.title),['월말 정산 주간'],'hidden rows are not public');
    const shared=await call(onRequestGet,req('GET','?month=2026-10&id='+id),env);
    assert.equal(shared.data.event,null,'hidden rows cannot be read by id either');

    const managed=await call(onRequestGet,req('GET','?month=2026-10&manage=1',{token:ADMIN}),env);
    assert.equal(managed.status,200);
    assert.equal(managed.cache,'no-store');
    const hidden=managed.data.items.find(i=>i.id===id);
    assert.equal(hidden.status,'hidden');
    assert.equal(hidden.updatedBy,'chair@cgma.or.kr');

    const removed=await call(onRequestDelete,req('DELETE','?id='+id,{token:ADMIN}),env);
    assert.equal(removed.status,200);
    const again=await call(onRequestDelete,req('DELETE','?id='+id,{token:ADMIN}),env);
    assert.equal(again.status,404);
    const missing=await call(onRequestPut,req('PUT','',{token:ADMIN,body:{id:9999,title:'x',startDate:'2026-10-01'}}),env);
    assert.equal(missing.status,404);
  }finally{restore()}
});

test('visitors and non-admin members cannot write or read hidden rows',async()=>{
  const restore=stubSupabase();
  const env={cheonggye_market_notices:d1()};
  try{
    const body={title:'x',startDate:'2026-10-28'};
    assert.equal((await call(onRequestPost,req('POST','',{body}),env)).status,401);
    assert.equal((await call(onRequestPost,req('POST','',{token:'forged',body}),env)).status,401);
    assert.equal((await call(onRequestPost,req('POST','',{token:MEMBER,body}),env)).status,403);
    assert.equal((await call(onRequestPut,req('PUT','',{token:MEMBER,body:{...body,id:1}}),env)).status,403);
    assert.equal((await call(onRequestDelete,req('DELETE','?id=1',{token:MEMBER}),env)).status,403);
    assert.equal((await call(onRequestGet,req('GET','?month=2026-10&manage=1',{token:MEMBER}),env)).status,403);
    assert.equal((await call(onRequestGet,req('GET','?month=2026-10&manage=1'),env)).status,401);
    // Nothing was written by any rejected request.
    // Authorization runs before storage is touched: the table was never even created.
    assert.equal(env.cheonggye_market_notices.sqlite.prepare("SELECT COUNT(*) n FROM sqlite_master WHERE name='cgma_schedule_events'").get().n,0);
  }finally{restore()}
});

test('invalid input and missing storage fail closed with explicit errors',async()=>{
  const restore=stubSupabase();
  try{
    const env={cheonggye_market_notices:d1()};
    assert.equal((await call(onRequestGet,req('GET','?month=2026-1'),env)).status,400);
    const bad=await call(onRequestPost,req('POST','',{token:ADMIN,body:{title:'x',startDate:'2026-10-28',endDate:'2026-10-01'}}),env);
    assert.deepEqual([bad.status,bad.data.error,bad.data.field],[400,'end_before_start','endDate']);
    const noId=await call(onRequestDelete,req('DELETE','?id=abc',{token:ADMIN}),env);
    assert.equal(noId.status,400);
    const down=await call(onRequestGet,req('GET','?month=2026-10'),{});
    assert.deepEqual([down.status,down.data.error],[503,'schedule_store_unavailable']);
    // Injection-shaped input is stored as text, never executed.
    const evil=await call(onRequestPost,req('POST','',{token:ADMIN,body:{title:"x'); DROP TABLE cgma_schedule_events;--",startDate:'2026-10-28'}}),env);
    assert.equal(evil.status,201);
    const list=await call(onRequestGet,req('GET','?month=2026-10'),env);
    assert.equal(list.data.items[0].title,"x'); DROP TABLE cgma_schedule_events;--");
  }finally{restore()}
});

test('client renders user text safely, gates editing on the server grant and wires the page',async()=>{
  const [client,html,nav,admin]=await Promise.all(['schedule-board.js','index.html','cgma-home-nav.js','admin-notices.js'].map(f=>readFile(new URL('./'+f,import.meta.url),'utf8')));
  assert.doesNotMatch(client,/innerHTML|insertAdjacentHTML|outerHTML/);
  assert.match(client,/\/api\/admin-session/);
  assert.match(client,/grant\.allowed===true/);
  assert.match(html,/id="scheduleApp"/);
  assert.match(html,/id="schedulePreview"/);
  assert.match(html,/<a href="#schedule">일정<\/a>/);
  assert.match(html,/schedule-board\.js\?v=20261019-schedule-v1/);
  assert.match(html,/id="scheduleAdd" type="button" hidden/);
  assert.match(nav,/schedule:\['schedule'\]/);
  assert.match(admin,/route\('\/#schedule'\)/);
});

test('calendar cells keep their height under the gateway readability stylesheet',async()=>{
  const css=await readFile(new URL('./schedule-board.css',import.meta.url),'utf8');
  // The injected rule html[data-ekodi-tenant-readability] :where(button) has specificity 0,1,1.
  // A bare .schedule-day (0,1,0) loses and collapses every day to 40px; regression seen live 2026-10-19.
  assert.match(css,/\.schedule-grid \.schedule-day\{display:flex;[^}]*min-height:78px/);
  assert.doesNotMatch(css,/(?<!\.schedule-grid )\.schedule-day\{[^}]*min-height/);
});
