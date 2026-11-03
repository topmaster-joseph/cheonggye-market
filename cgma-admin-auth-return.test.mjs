import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('./admin/index.html',import.meta.url),'utf8');
const dashboard=readFileSync(new URL('./admin-dashboard.js',import.meta.url),'utf8');
const match=html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/);
assert.ok(match,'the real admin inline auth script must be present');
const authScript=match[1];

function setup({href='https://cgma.or.kr/admin/#ipArchive',allow=false,session=false,verifyError=false}={}){
  let current=new URL(href);
  const elements=new Map(),replacements=[],verifyCalls=[],apiCalls=[],events=[];
  let authenticated=session;
  const element=selector=>{
    if(!elements.has(selector))elements.set(selector,{hidden:true,textContent:'',title:'',href:''});
    return elements.get(selector);
  };
  const location={
    get href(){return current.href},get hash(){return current.hash},
    get pathname(){return current.pathname},get search(){return current.search}
  };
  const history={replaceState(_state,_title,path){
    replacements.push(path);
    current=new URL(path,current.origin);
  }};
  const window={
    dispatchEvent(event){events.push(event.type);return true},
    CGMA_ROUTE:{route:path=>path},
    supabase:{createClient(){return {auth:{
      async verifyOtp(payload){
        verifyCalls.push(payload);
        if(verifyError)return {error:new Error('expired')};
        authenticated=true;
        return {error:null};
      },
      async getSession(){return {data:{session:authenticated?{access_token:'mock-session'}:null}}}
    }}}}
  };
  const document={
    title:'관리자',
    readyState:'loading',
    documentElement:{dataset:{}},
    addEventListener(){},
    querySelector:element
  };
  const fetch=async (url,options)=>{
    apiCalls.push({url,options});
    return {ok:true,json:async()=>({allowed:allow,authority:'tenant',email:'operator@example.invalid'})};
  };
  const context={
    window,document,location,history,URL,URLSearchParams,
    Event:class Event{constructor(type){this.type=type}},
    fetch,console:{error(){}}
  };
  runInNewContext(dashboard,context);
  runInNewContext(authScript,context);
  async function settle(){
    for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));
  }
  return {
    get href(){return current.href},get url(){return current},
    get nav(){return window.CGMA_ADMIN_NAV},
    get login(){return new URL(element('#adminLoginLink').href)},
    get denied(){return element('#adminDenied').hidden===false},
    get appVisible(){return element('#adminApp').hidden===false},
    replacements,verifyCalls,apiCalls,events,settle
  };
}

const returnTo=h=>new URL(h.login.searchParams.get('return_to'));

test('selected admin tab survives canonical central login URL without a fragile hash',async()=>{
  const h=setup();
  const login=h.login,back=returnTo(h);
  assert.equal(login.origin,'https://ekodi.kr');
  assert.equal(login.pathname,'/auth/');
  assert.equal(login.searchParams.get('site'),'cgma');
  assert.equal(login.searchParams.get('direct'),'1');
  assert.equal(back.origin,'https://cgma.or.kr');
  assert.equal(back.pathname,'/admin/');
  assert.equal(back.searchParams.get('cgma_return_panel'),'ipArchive');
  assert.equal(back.hash,'');
  await h.settle();
  assert.ok(h.denied,'guest user must not enter admin');
  assert.equal(h.apiCalls.length,0);
});

test('hash wins over stale section query, without redundant route data on the return URL',()=>{
  const h=setup({href:'https://cgma.or.kr/admin/?section=ipArchive#memberReview'});
  const back=returnTo(h);
  assert.equal(back.searchParams.get('cgma_return_panel'),'memberReview');
  assert.equal(back.searchParams.has('section'),false);
});

test('inline workbench retains section contract across login',()=>{
  const h=setup({href:'https://cgma.or.kr/admin/?inline=1&section=ipArchive'});
  const back=returnTo(h);
  assert.equal(back.searchParams.get('inline'),'1');
  assert.equal(back.searchParams.get('section'),'ipArchive');
  assert.equal(back.searchParams.get('cgma_return_panel'),'ipArchive');
});

test('one-time callback restores exact tab before site-admin authorization and scrubs OTP',async()=>{
  const h=setup({href:'https://cgma.or.kr/admin/?cgma_return_panel=ipArchive#ekodi_token=once-only&ekodi_type=email',allow:true});
  await h.settle();
  assert.equal(h.url.hash,'#ipArchive');
  assert.equal(h.nav.currentPanel(),'ipArchive');
  assert.equal(h.url.searchParams.has('cgma_return_panel'),false);
  assert.equal(h.replacements.length,1);
  assert.ok(!h.replacements[0].includes('once-only'),'OTP must not appear in browser history');
  assert.equal(h.verifyCalls.length,1);
  assert.equal(h.verifyCalls[0].token_hash,'once-only');
  assert.equal(h.apiCalls.length,1);
  assert.equal(h.apiCalls[0].url,'/api/admin-session');
  assert.equal(h.apiCalls[0].options.headers.Authorization,'Bearer mock-session');
  assert.ok(h.events.includes('hashchange'),'tab UI must sync after replaceState');
  assert.ok(h.appVisible);
});

test('expired callback fails closed, but still restores original selection',async()=>{
  const h=setup({href:'https://cgma.or.kr/admin/?cgma_return_panel=languageManager#ekodi_token=expired',verifyError:true});
  await h.settle();
  assert.equal(h.url.hash,'#languageManager');
  assert.equal(h.nav.currentPanel(),'languageManager');
  assert.equal(h.apiCalls.length,0,'site-admin API must never run after failed auth handoff');
  assert.ok(h.denied);
  assert.equal(returnTo(h).searchParams.get('cgma_return_panel'),'languageManager');
});

test('cancelled login restores tab and leaves no unauthorized admin access',async()=>{
  const h=setup({href:'https://cgma.or.kr/admin/?cgma_return_panel=petitionManager'});
  await h.settle();
  assert.equal(h.url.hash,'#petitionManager');
  assert.equal(h.nav.currentPanel(),'petitionManager');
  assert.ok(h.denied);
  assert.equal(h.apiCalls.length,0);
});

test('unknown return panel is rejected and never used as an arbitrary DOM selector',async()=>{
  const h=setup({href:'https://cgma.or.kr/admin/?cgma_return_panel=otherSiteAdmin#ekodi_token=once-only'});
  await h.settle();
  assert.equal(h.url.hash,'');
  assert.equal(h.nav.currentPanel(),'memberReview');
  assert.equal(h.url.searchParams.has('cgma_return_panel'),false);
  assert.ok(h.denied);
});

test('admin callback preserves legacy section links without changing privileges',async()=>{
  const h=setup({href:'https://cgma.or.kr/admin/?section=ipArchive#ekodi_token=once-only',allow:false});
  await h.settle();
  assert.equal(h.nav.currentPanel(),'ipArchive');
  assert.equal(h.url.hash,'');
  assert.ok(h.denied);
  assert.equal(h.apiCalls.length,1);
});

test('admin auth remains tenant-bound and callback does not write authorization state',()=>{
  assert.match(authScript,/\/api\/admin-session/);
  assert.match(authScript,/!response\.ok\|\|!result\.allowed/);
  assert.match(authScript,/client\.auth\.verifyOtp/);
  assert.match(authScript,/history\.replaceState/);
  assert.doesNotMatch(authScript,/localStorage\.setItem|sessionStorage\.setItem/);
  assert.match(html,/admin-dashboard\.js\?v=20261103-authreturn-v2/);
});
