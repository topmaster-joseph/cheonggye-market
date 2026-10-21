import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const source=await readFile(new URL('./cgma-inline-management.js',import.meta.url),'utf8');
const key='sb-renzehysxirjilvdxacv-auth-token';
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function harness({token='demo.'.repeat(20),allowed=true,scriptOrigin='https://ekodi.kr',search='',throwFetch=false}={}){
  let value=token?JSON.stringify({access_token:token}):null;
  const calls=[],events={},created=[];
  const classes=new Set();
  const link={hidden:true,href:'',onclick:null};
  const assigned=[];
  const location={origin:'https://ekodi.kr',pathname:'/cgma/ai-education/',search,hash:'',assign:url=>assigned.push(url)};
  const document={
    readyState:'complete',
    currentScript:{src:scriptOrigin+'/cgma/cgma-inline-management.js'},
    documentElement:{classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}},
    getElementById:id=>id==='adminStatsLink'?link:null,
    createElement:tag=>{const el={tag,className:'',textContent:'',hidden:false,children:[],dataset:{},
      setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]},addEventListener(){},focus(){},
      append(...c){this.children.push(...c)},
      querySelector(sel){const cls=sel.replace(/^\./,'');const walk=n=>{for(const c of n.children||[]){if(String(c.className).split(' ').includes(cls))return c;const f=walk(c);if(f)return f}return null};return walk(this)}};
      created.push(el);return el},
    body:{append(){}},
    activeElement:null,
    querySelectorAll:()=>[],
    querySelector:()=>null,
    addEventListener:(name,handler)=>{events[name]=handler}
  };
  const window={addEventListener:(name,handler)=>{events[name]=handler}};
  const fetch=async (url,options)=>{
    calls.push({url,options});
    if(throwFetch)throw new TypeError('offline');
    return {ok:allowed,status:allowed?200:403,json:async()=>({allowed})};
  };
  const localStorage={getItem:k=>k===key?value:null};
  runInNewContext(source,{document,window,location,history:{replaceState(){}},
    URL,URLSearchParams,localStorage,fetch,console:{warn(){}},});
  return {link,calls,events,classes,assigned,created,setToken:t=>{value=t?JSON.stringify({access_token:t}):null}};
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

test('접수현황 deep link without a CGMA session goes to the admin sign-in page instead of failing silently',async()=>{
  const h=harness({token:null,search:'?manage=educationSurveyManager'});
  await flush();
  assert.deepEqual(h.assigned,['https://ekodi.kr/cgma/admin/#educationSurveyManager']);
  assert.equal(h.calls.length,0,'no token is sent anywhere');
  h.events.focus();await flush();
  assert.equal(h.assigned.length,1,'fallback happens once');
});
test('deep link with a non-admin session also falls back to the admin page once',async()=>{
  const h=harness({allowed:false,search:'?manage=educationSurveyManager'});
  await flush();
  assert.deepEqual(h.assigned,['https://ekodi.kr/cgma/admin/#educationSurveyManager']);
});
test('deep link with a verified admin session opens in place and never redirects',async()=>{
  const h=harness({search:'?manage=educationSurveyManager'});
  await flush();
  assert.equal(h.assigned.length,0);
  assert.equal(h.link.hidden,false);
  const frame=h.created.find(el=>el.tag==='iframe');
  assert.ok(frame,'statistics drawer is opened');
  assert.equal(frame.src,'https://ekodi.kr/cgma/admin/?inline=1&section=educationSurveyManager#educationSurveyManager');
});
test('ordinary survey visitors are never redirected',async()=>{
  const h=harness({token:null});
  await flush();
  assert.equal(h.assigned.length,0);
  const h2=harness({token:null,search:'?manage=unknownPanel'});
  await flush();
  assert.equal(h2.assigned.length,0,'unknown panels are ignored');
});
test('permission check network failure on a deep link still lands on the admin page',async()=>{
  const h=harness({search:'?manage=educationSurveyManager',throwFetch:true});
  await flush();
  assert.deepEqual(h.assigned,['https://ekodi.kr/cgma/admin/#educationSurveyManager']);
});
