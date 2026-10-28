import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('./cgma-programs.js',import.meta.url),'utf8');
const sdkImport="import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')";
assert.ok(source.includes(sdkImport),'production uses the shared Supabase SDK');
const testSource=source.replace(sdkImport,'loadSdk()');
const KEY='sb-renzehysxirjilvdxacv-auth-token';
const fresh=()=>({access_token:'mock-access-token-'.repeat(5),refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600});

function setup({href='https://cgma.or.kr/programs/ai-marketing-2026/#manage',stored=null,verifyError=false,refresh=false}={}){
  let current=new URL(href);
  const storage=new Map();
  if(stored)storage.set(KEY,JSON.stringify(stored));
  const calls=[],replacements=[],verified=[];
  let sdkLoads=0;
  const localStorage={
    getItem:key=>storage.get(key)||null,
    setItem:(key,val)=>storage.set(key,String(val)),
    removeItem:key=>storage.delete(key)
  };
  const location={
    get href(){return current.href},
    get pathname(){return current.pathname},
    get hash(){return current.hash},
    get origin(){return current.origin}
  };
  const history={replaceState(_state,_title,to){replacements.push(to);current=new URL(to,current.origin)}};
  const document={title:'CGMA',readyState:'loading',addEventListener(){}};
  const window={};
  const loadSdk=async()=>{
    sdkLoads++;
    return {createClient:()=>({auth:{
      async verifyOtp(request){
        verified.push(request);
        if(verifyError)return {data:null,error:new Error('expired')};
        const session=fresh();
        localStorage.setItem(KEY,JSON.stringify(session));
        return {data:{session},error:null};
      },
      async getSession(){
        if(!refresh)return {data:{session:null},error:new Error('no-session')};
        const session=fresh();
        localStorage.setItem(KEY,JSON.stringify(session));
        return {data:{session},error:null};
      }
    }})};
  };
  const fetch=async (url,opts)=>{
    calls.push({url,opts});
    return {ok:true,json:async()=>true};
  };
  runInNewContext(testSource,{
    document,window,location,history,localStorage,loadSdk,fetch,
    URL,URLSearchParams,AbortController,setTimeout,clearTimeout,
    console:{warn(){},error(){}}
  });
  return {api:window.CGMA_PROGRAMS,location,calls,replacements,verified,get sdkLoads(){return sdkLoads}};
}

test('management deep link stores view in allowlisted return_to query, not a fragile hash',()=>{
  const h=setup();
  const auth=new URL(h.api.loginUrl());
  assert.equal(auth.origin,'https://ekodi.kr');
  assert.equal(auth.pathname,'/auth/');
  assert.equal(auth.searchParams.get('site'),'cgma');
  assert.equal(auth.searchParams.get('direct'),'1');
  const back=new URL(auth.searchParams.get('return_to'));
  assert.equal(back.origin,'https://cgma.or.kr');
  assert.equal(back.pathname,'/programs/ai-marketing-2026/');
  assert.equal(back.searchParams.get('ekodi_return'),'manage');
  assert.equal(back.hash,'');
});

test('central handoff consumes OTP before checking admin and restores #manage',async()=>{
  const h=setup({href:'https://cgma.or.kr/programs/ai-marketing-2026/?ekodi_return=manage#ekodi_token=one-time-code&ekodi_type=email'});
  assert.equal(await h.api.isAdmin(),true);
  assert.equal(h.location.hash,'#manage');
  assert.equal(new URL(h.location.href).searchParams.has('ekodi_return'),false);
  assert.equal(h.replacements.length,1);
  assert.ok(!h.replacements[0].includes('one-time-code'),'one-time OTP was removed from browser history');
  assert.equal(h.verified.length,1);
  assert.equal(h.verified[0].token_hash,'one-time-code');
  assert.equal(h.calls.length,1);
  assert.match(h.calls[0].url,/cgma_is_site_admin$/);
  assert.equal(h.calls[0].opts.headers.authorization,'Bearer '+JSON.parse(JSON.stringify(fresh())).access_token);
  assert.equal(h.api.authError(),'');
});

test('invalid/expired handoff fails closed without sending an admin request',async()=>{
  const h=setup({href:'https://cgma.or.kr/programs/ai-marketing-2026/?ekodi_return=manage#ekodi_token=expired',verifyError:true});
  assert.equal(await h.api.isAdmin(),false);
  assert.equal(h.calls.length,0);
  assert.equal(h.location.hash,'#manage');
  assert.match(h.api.authError(),/다시 시도/);
});

test('expired but refreshable site session gets a fresh token',async()=>{
  const h=setup({stored:{access_token:'expired-access-token-'.repeat(5),refresh_token:'existing-refresh',expires_at:1},refresh:true});
  assert.equal(await h.api.isAdmin(),true);
  assert.equal(h.sdkLoads,1);
  assert.equal(h.calls.length,1);
  assert.match(h.calls[0].opts.headers.authorization,/^Bearer mock-access-token-/);
});

test('guest page does not load auth SDK or call any private RPC',async()=>{
  const h=setup({href:'https://cgma.or.kr/programs/ai-marketing-2026/'});
  assert.equal(await h.api.isAdmin(),false);
  assert.equal(h.sdkLoads,0);
  assert.equal(h.calls.length,0);
});

test('cancelled login recovers manage view and provides a retry message',async()=>{
  const h=setup({href:'https://cgma.or.kr/programs/ai-marketing-2026/?ekodi_return=manage'});
  assert.equal(await h.api.isAdmin(),false);
  assert.equal(h.location.hash,'#manage');
  assert.match(h.api.authError(),/다시 로그인/);
});
