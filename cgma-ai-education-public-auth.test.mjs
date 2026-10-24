import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const html=read('programs/ai-marketing-2026/index.html');
const app=read('programs/ai-marketing-2026/app.js');
const shared=read('cgma-programs.js');
const css=read('programs/ai-marketing-2026/style.css');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function makePage(initialUser){
  const elements=new Map();
  const rpcCalls=[];
  let user=initialUser,signOutCount=0;
  const el=id=>{
    if(!elements.has(id)){
      elements.set(id,{
        id,value:'',textContent:'',hidden:id==='ai-edu-logout',
        disabled:false,checked:false,href:'',
        innerHTML:'',className:'',
        events:{},addEventListener(type,fn){this.events[type]=fn},
        append(){},focus(){},querySelectorAll(){return []},reset(){}
      });
    }
    return elements.get(id);
  };
  const document={getElementById:el,createElement:()=>({innerHTML:'',append(){}})};
  const api={
    currentUser:async()=>user,
    signOut:async()=>{signOutCount++;user=null},
    loginUrl:()=> 'https://auth.ekodi.kr/?site=cgma&direct=1&return_to=https%3A%2F%2Fcgma.or.kr%2Fprograms%2Fai-marketing-2026%2F',
    rpc:async(fn)=>{
      rpcCalls.push(fn);
      if(fn==='cgma_ai_edu_2026_public_stats')return {is_open:true,capacity:15,active:1,waiting:0};
      throw Error('no applicant roster access');
    }
  };
  runInNewContext(app,{window:{CGMA_PROGRAMS:api},document,location:{hash:''},console,Date,URL});
  return {el,rpcCalls,get signOutCount(){return signOutCount}};
}

test('public registration HTML shows working login link even without JavaScript',()=>{
  assert.match(html,/<a[^>]+id="ai-edu-login"[^>]+href="https:\/\/auth\.ekodi\.kr\//);
  assert.match(html,/<button[^>]+id="ai-edu-logout" hidden>로그아웃<\/button>/);
  assert.match(html,/id="ai-edu-auth-status"[^>]+aria-live="polite"/);
  assert.match(html,/href="\.\/manage\/">신청현황 관리/);
  assert.match(css,/\.top nav \[hidden\]\{display:none!important\}/);
  assert.match(css,/@media\(max-width:620px\)/);
});

test('logged-out applicant sees Google login, not logout, and no private API runs',async()=>{
  const p=makePage(null);await tick();
  assert.equal(p.el('ai-edu-login').hidden,false);
  assert.equal(p.el('ai-edu-logout').hidden,true);
  assert.match(p.el('ai-edu-login').href,/auth\.ekodi\.kr/);
  assert.deepEqual(p.rpcCalls,['cgma_ai_edu_2026_public_stats']);
});

test('signed-in applicant sees logout, and clicking clears only browser session',async()=>{
  const p=makePage({id:'google-user'});await tick();
  assert.equal(p.el('ai-edu-login').hidden,true);
  assert.equal(p.el('ai-edu-logout').hidden,false);
  await p.el('ai-edu-logout').events.click();
  assert.equal(p.signOutCount,1);
  assert.equal(p.el('ai-edu-login').hidden,false);
  assert.equal(p.el('ai-edu-logout').hidden,true);
  assert.deepEqual(p.rpcCalls,['cgma_ai_edu_2026_public_stats']);
});

test('Google session validation and logout reuse shared EKODI auth and never grant admin',()=>{
  assert.match(shared,/async function currentUser\(\)/);
  assert.match(shared,/sb\.auth\.getUser\(\)/);
  assert.match(shared,/sb\.auth\.signOut\(\{scope:'local'\}\)/);
  assert.match(shared,/window\.CGMA_PROGRAMS=Object\.freeze\(\{rpc,token,isAdmin,loginUrl,currentUser,signOut/);
  assert.doesNotMatch(app,/cgma_ai_edu_2026_admin_list|cgma_ai_edu_2026_admin_update|cgma_is_site_admin/);
});
