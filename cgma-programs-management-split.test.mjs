import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const root=new URL('./',import.meta.url);
const source=readFileSync(new URL('./programs/ai-marketing-2026/manage/app.js',root),'utf8');
const publicJs=readFileSync(new URL('./programs/ai-marketing-2026/app.js',root),'utf8');
const publicHtml=readFileSync(new URL('./programs/ai-marketing-2026/index.html',root),'utf8');
const managerHtml=readFileSync(new URL('./programs/ai-marketing-2026/manage/index.html',root),'utf8');
const sharedJs=readFileSync(new URL('./cgma-programs.js',root),'utf8');

const tick=()=>new Promise(resolve=>setImmediate(resolve));
function boot({allowed=false,pinAllowed=false,listingFailure=false,authMessage=''}={}){
  const events=[],classNames=[],elements=new Map();
  function elt(id){
    if(!elements.has(id))elements.set(id,{
      id,hidden:id==='manage',innerHTML:'',textContent:'',value:'',checked:false,
      classList:{add(x){classNames.push(x)},toggle(){}},
      style:{},contains(){return false},addEventListener(){},scrollIntoView(){}
    });
    return elements.get(id);
  }
  const api={
    esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
    isAdmin:async()=>allowed,
    authError:()=>authMessage,
    loginUrl:()=> 'https://auth.ekodi.kr/?site=cgma&direct=1&return_to=https%3A%2F%2Fcgma.or.kr%2Fprograms%2Fai-marketing-2026%2Fmanage%2F',
    async rpc(name,body,{auth}={}){
      events.push({name,body,auth});
      if(!allowed&&!(pinAllowed&&body?.p_pin==='test-only-secret'))throw Error('unauthorized');
      if(listingFailure)throw Error('list unavailable');
      if(name==='cgma_ai_edu_2026_admin_list')return {ok:true,rows:[],settings:{capacity:15,is_open:true}};
      throw Error('unexpected write');
    }
  };
  const document={
    getElementById:elt,activeElement:null,documentElement:{classList:{add:n=>classNames.push(n)}}
  };
  const context={window:{CGMA_PROGRAMS:api},document,location:{hash:''},setInterval:()=>1,setTimeout:()=>1,URL,Date,navigator:{}};
  runInNewContext(source,context);
  return {events,elements,classNames,elt};
}

test('the public HTML and script never load a private roster or management handler',()=>{
  assert.match(publicHtml,/href="\.\/manage\/">신청현황 관리/);
  assert.doesNotMatch(publicHtml,/id="manage" class="manage"/);
  assert.doesNotMatch(publicHtml,/manage\/app\.js/);
  assert.doesNotMatch(publicJs,/cgma_ai_edu_2026_admin_list|cgma_ai_edu_2026_admin_update|p_pin/);
  assert.match(publicJs,/cgma_ai_edu_2026_apply/);
  assert.match(publicJs,/cgma_ai_edu_2026_lookup/);
});

test('the standalone management HTML is noindex, with no public application form',()=>{
  assert.match(managerHtml,/noindex,nofollow,noarchive/);
  assert.match(managerHtml,/id="manage" class="manage" hidden/);
  assert.doesNotMatch(managerHtml,/id="apply"|id="lookup"|name="consent_privacy"/);
});

test('a guest cannot load applicant records and instead sees central Google admin login',async()=>{
  const page=boot({allowed:false});
  await tick();
  assert.equal(page.events.length,0,'no applicant API call before authorization');
  assert.equal(page.elt('manage').hidden,false,'visible sign-in gate');
  assert.match(page.elt('manage').innerHTML,/교육 신청현황 전용 로그인/);
  assert.match(page.elt('manage').innerHTML,/auth\.ekodi\.kr/);
  assert.doesNotMatch(page.elt('manage').innerHTML,/휴대폰 번호|신청자명단|엑셀\(CSV\)/);
});

test('verified administrator opens a separate management workspace and reads only server-authorized RPC',async()=>{
  const page=boot({allowed:true});
  await tick();await tick();
  assert.equal(page.events.length,1);
  assert.equal(page.events[0].name,'cgma_ai_edu_2026_admin_list');
  assert.equal(page.events[0].auth,true);
  assert.equal(page.elt('manage').hidden,false);
  assert.match(page.elt('manage').innerHTML,/엑셀\(CSV\) 받기/);
  assert.match(page.elt('manage').innerHTML,/m-roster/);
  assert.ok(page.classNames.includes('cgma-can-manage'));
});

test('a server error does not leak records or remove retry controls',async()=>{
  const page=boot({allowed:true,listingFailure:true});
  await tick();await tick();
  assert.equal(page.events.length,1);
  assert.match(page.elt('manage').innerHTML,/id="m-refresh"/);
  assert.match(page.elt('m-msg').textContent,/불러오지 못했습니다|새로고침/);
});

test('legacy #manage links remain supported without leaking the former private panel',()=>{
  assert.match(publicJs,/location\.hash==='#manage'/);
  assert.match(publicJs,/whenAuthReady\(\)\.finally/);
  assert.match(publicJs,/location\.replace\(P\.route\('\/programs\/ai-marketing-2026\/manage\/'\)\)/);
  assert.match(sharedJs,/raw==='\/programs\/ai-marketing-2026\/#manage'/);
  assert.match(sharedJs,/whenAuthReady:\(\)=>authReady/);
});

test('guest PIN only opens the scoped roster after server-verified list response',async()=>{
  const guest=boot({allowed:false,pinAllowed:true});
  await tick();
  assert.equal(guest.events.length,0);
  guest.elt('m-pin').value='test-only-secret';
  await guest.elt('m-pin-form').onsubmit({preventDefault(){}});
  assert.equal(guest.events.length,1);
  assert.equal(guest.events[0].name,'cgma_ai_edu_2026_admin_list');
  assert.equal(guest.events[0].auth,false);
  assert.equal(guest.events[0].body.p_pin,'test-only-secret');
  assert.match(guest.elt('manage').innerHTML,/m-roster/);
  assert.ok(!guest.classNames.includes('cgma-can-manage'),'PIN does not unlock site-admin UI');
});

test('incorrect PIN never displays applicant roster',async()=>{
  const guest=boot({allowed:false,pinAllowed:false});
  await tick();
  guest.elt('m-pin').value='wrong-code';
  await guest.elt('m-pin-form').onsubmit({preventDefault(){}});
  assert.equal(guest.events.length,1);
  assert.doesNotMatch(guest.elt('manage').innerHTML,/m-roster/);
  assert.match(guest.elt('m-pin-msg').textContent,/비밀번호/);
});

test('password stays out of client source and summary row exposes no phone or sensitive detail',()=>{
  assert.doesNotMatch(source,/1234567890|localStorage\.setItem\(.{0,100}pin/);
  assert.match(source,/data-expand/);
  assert.match(source,/aria-expanded/);
  assert.match(source,/m-detail-card/);
  assert.match(source,/m-detail-grid/);
  assert.match(source,/p_pin:pin/);
});
