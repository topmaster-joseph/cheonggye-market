import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source=await readFile(new URL('./cgma-inline-management.js',import.meta.url),'utf8');
const key='sb-renzehysxirjilvdxacv-auth-token';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function harness({token='demo.'.repeat(20),allowed=true,scriptOrigin='https://ekodi.kr'}={}){
  let value=token?JSON.stringify({access_token:token}):null;
  const calls=[],events={};
  const classes=new Set();
  const link={hidden:true,href:'',onclick:null};
  const location={origin:'https://ekodi.kr',pathname:'/cgma/ai-education/',search:'',hash:''};
  const document={
    readyState:'complete',
    currentScript:{src:scriptOrigin+'/cgma/cgma-inline-management.js'},
    documentElement:{classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}},
    getElementById:id=>id==='adminStatsLink'?link:null,
    querySelectorAll:()=>[],
    querySelector:()=>null,
    addEventListener:(name,handler)=>{events[name]=handler}
  };
  const window={addEventListener:(name,handler)=>{events[name]=handler}};
  const fetch=async (url,options)=>{
    calls.push({url,options});
    return {ok:allowed,status:allowed?200:403,json:async()=>({allowed})};
  };
  const localStorage={getItem:k=>k===key?value:null};
  runInNewContext(source,{document,window,location,history:{replaceState(){}},
    URL,URLSearchParams,localStorage,fetch,console:{warn(){}},});
  return {link,calls,events,classes,setToken:t=>{value=t?JSON.stringify({access_token:t}):null}};
}
test('survey management works with authenticated EKODI session even when CDN SDK is blocked',async()=>{
  const token='local-access-token.'.repeat(7);
  const h=harness({token});
  await flush();
  assert.equal(h.calls.length,1);
  assert.equal(h.calls[0].url,'https://ekodi.kr/cgma/api/admin-session');
  assert.equal(h.calls[0].options.headers.Authorization,'Bearer '+token);
  assert.equal(h.calls[0].options.credentials,'same-origin');
  assert.equal(h.link.hidden,false);
  assert.equal(h.link.href,'?manage=educationSurveyManager');
  assert.equal(h.classes.has('cgma-can-manage'),true);
});
test('local session is not itself proof of administrator authority',async()=>{
  const h=harness({allowed:false});
  await flush();
  assert.equal(h.calls.length,1);
  assert.equal(h.link.hidden,true);
  assert.equal(h.classes.has('cgma-can-manage'),false);
});
test('cross-tab logout revokes survey management on storage event',async()=>{
  const h=harness();
  await flush();
  assert.equal(h.link.hidden,false);
  h.setToken(null);
  h.events.storage({key});
  await flush();
  assert.equal(h.link.hidden,true);
  assert.equal(h.link.onclick,null);
  assert.equal(h.classes.has('cgma-can-manage'),false);
});
test('cross-origin script never receives an EKODI access token',async()=>{
  const h=harness({scriptOrigin:'https://other.example'});
  await flush();
  assert.equal(h.calls.length,0);
  assert.equal(h.link.hidden,true);
});
