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
function boot({allowed=false,scoped=false,loggedIn=allowed||scoped,signOutFailure=false,listingFailure=false,authMessage=''}={}){
  const events=[],classNames=[],elements=new Map(),redirects=[];
  let logoutCalls=0;
  function elt(id){
    if(!elements.has(id))elements.set(id,{
      id,hidden:id==='manage'||id==='cgma-manage-logout',innerHTML:'',textContent:'',value:'',checked:false,disabled:false,href:'',
      listeners:{},classList:{add(x){classNames.push(x)},toggle(){}},
      style:{},contains(){return false},querySelectorAll(){return []},addEventListener(event,handler){this.listeners[event]=handler},scrollIntoView(){}
    });
    return elements.get(id);
  }
  const api={
    esc:s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;'),
    isAdmin:async()=>allowed,
    currentUser:async()=>loggedIn?{id:'verified-user'}:null,
    signOut:async()=>{logoutCalls++;if(signOutFailure)throw Error('cannot sign out')},
    token:()=>scoped?'scoped-verified-access-token':null,
    authError:()=>authMessage,
    loginUrl:()=> 'https://ekodi.kr/auth/?site=cgma&direct=1&return_to=https%3A%2F%2Fcgma.or.kr%2Fprograms%2Fai-marketing-2026%2Fmanage%2F',
    async rpc(name,body,{auth}={}){
      events.push({name,body,auth});
      if(!allowed&&!scoped)throw Error('unauthorized');
      if(listingFailure)throw Error('list unavailable');
      if(name==='cgma_ai_edu_2026_admin_list')return {ok:true,rows:[],settings:{capacity:15,is_open:true}};
      throw Error('unexpected write');
    }
  };
  const document={
    getElementById:elt,activeElement:null,documentElement:{classList:{add:n=>classNames.push(n)}}
  };
  const location={hash:'',pathname:'/programs/ai-marketing-2026/manage/',search:'',replace(to){redirects.push(to)}};
  const context={window:{CGMA_PROGRAMS:api,confirm:()=>true},document,location,setInterval:()=>1,setTimeout:()=>1,URL,Date,navigator:{}};
  runInNewContext(source,context);
  return {events,elements,classNames,elt,redirects,get logoutCalls(){return logoutCalls}};
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
  assert.match(managerHtml,/id="manage" class="manage" aria-label/);
  assert.match(managerHtml,/id="cgma-roster-login"[\s\S]*?Google 계정으로 로그인/);
  assert.doesNotMatch(managerHtml,/name="consent_privacy"|data-status|cgma_ai_edu_2026_admin_list/);
  assert.doesNotMatch(managerHtml,/id="apply"|id="lookup"|name="consent_privacy"/);
});

test('a guest cannot load applicant records and instead sees central Google admin login',async()=>{
  const page=boot({allowed:false});
  await tick();
  assert.equal(page.events.length,0,'no applicant API call before authorization');
  assert.equal(page.elt('manage').hidden,false,'visible sign-in gate');
  assert.match(page.elt('manage').innerHTML,/관리자 인증이 필요합니다/);
  assert.match(page.elt('manage').innerHTML,/https:\/\/ekodi\.kr\/auth\/\?site=cgma/);
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

test('compact roster reveals private fields only after an explicit row expand',()=>{
  assert.match(source,/data-expand/);
  assert.match(source,/aria-expanded/);
  assert.match(source,/m-detail-card/);
  assert.match(source,/m-detail-grid/);
  assert.match(source,/m-detail-actions/);
  assert.match(source,/target\.closest\('\.m-detail-actions'\)/);
});

test('verified education-only account opens roster without site-admin privileges',async()=>{
  const page=boot({allowed:false,scoped:true});
  await tick();await tick();
  assert.equal(page.events.length,1,'one scoped RPC, no privileged admin RPC');
  assert.equal(page.events[0].name,'cgma_ai_edu_2026_admin_list');
  assert.equal(page.events[0].auth,true,'scoped access requires a signed-in account');
  assert.equal(page.events[0].body.p_pin,null,'Google flow never sends a shared password');
  assert.equal(page.elt('manage').hidden,false);
  assert.match(page.elt('manage').innerHTML,/m-roster/);
  assert.doesNotMatch(page.classNames.join(' '),/cgma-can-manage/,'other CGMA manager pages remain locked');
});

test('unauthorized signed-in accounts still receive no roster',async()=>{
  const page=boot({allowed:false,scoped:false});
  await tick();await tick();
  assert.equal(page.events.length,0);
  assert.match(page.elt('manage').innerHTML,/관리자 인증이 필요합니다/);
  assert.doesNotMatch(page.elt('manage').innerHTML,/m-roster/);
});

test('education-only access uses server-validated scope and does not expose privileged credentials',()=>{
  assert.match(source,/hasScopedRosterAccess/);
  assert.match(source,/if\(!P\.token\?\.\(\)\)return false/);
  assert.match(source,/cgma_ai_edu_2026_admin_list/);
  assert.doesNotMatch(source,/dlaehd12345619|service_role|SUPABASE_SERVICE/i);
});

test('manager header keeps a static login button and an initially hidden logout control',()=>{
  assert.match(managerHtml,/id="cgma-manage-login"[^>]*>Google 로그인/);
  assert.match(managerHtml,/id="cgma-manage-logout" hidden>로그아웃/);
  assert.match(managerHtml,/id="cgma-manage-auth-message"[^>]*aria-live="polite"/);
});

test('Google roster-only manager sees logout even without general CGMA admin access',async()=>{
  const page=boot({scoped:true});
  await tick();await tick();
  assert.equal(page.elt('cgma-manage-login').hidden,true);
  assert.equal(page.elt('cgma-manage-logout').hidden,false);
  assert.match(page.elt('manage').innerHTML,/m-roster/);
  assert.ok(!page.classNames.includes('cgma-can-manage'));
});

test('authenticated site administrator also sees logout in the roster page',async()=>{
  const page=boot({allowed:true});
  await tick();await tick();
  assert.equal(page.elt('cgma-manage-logout').hidden,false);
  assert.equal(page.elt('cgma-manage-login').hidden,true);
});

test('roster logout signs out locally, removes applicant HTML and navigates to guest gate',async()=>{
  const page=boot({scoped:true});
  await tick();await tick();
  const button=page.elt('cgma-manage-logout');
  assert.match(page.elt('manage').innerHTML,/m-roster/);
  await button.listeners.click();
  assert.equal(page.logoutCalls,1);
  assert.doesNotMatch(page.elt('manage').innerHTML,/m-roster|엑셀\(CSV\)/);
  assert.equal(button.hidden,true);
  assert.equal(page.elt('cgma-manage-login').hidden,false);
  assert.deepEqual(page.redirects,['/programs/ai-marketing-2026/manage/']);
});

test('logout errors preserve the page and show a retry message',async()=>{
  const page=boot({scoped:true,signOutFailure:true});
  await tick();await tick();
  await page.elt('cgma-manage-logout').listeners.click();
  assert.equal(page.logoutCalls,1);
  assert.equal(page.elt('cgma-manage-logout').disabled,false);
  assert.match(page.elt('manage').innerHTML,/m-roster/);
  assert.equal(page.elt('cgma-manage-auth-message').hidden,false);
  assert.equal(page.redirects.length,0);
});

test('guest sees login but no logout or applicant details',async()=>{
  const page=boot({allowed:false,scoped:false,loggedIn:false});
  await tick();await tick();
  assert.equal(page.elt('cgma-manage-logout').hidden,true);
  assert.equal(page.elt('cgma-manage-login').hidden,false);
  assert.doesNotMatch(page.elt('manage').innerHTML,/m-roster|휴대폰 번호/);
});
