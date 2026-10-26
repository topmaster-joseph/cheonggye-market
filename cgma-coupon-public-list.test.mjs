// Public approved-merchant list (#185 Edge structure): no PII in API or page, admin routes unaffected.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHandler} from './supabase/functions/cgma-festival-intake/index.ts';

const EDGE='https://edge.test/functions/v1/cgma-festival-intake/';
function backend(rows=[{shop_name:'승인상점',location_text:'청계면 1',items:'커피',phone:'01012345678',receipt:'x'}]){
  const calls=[];
  const fetchImpl=async(url,init={})=>{
    const u=new URL(url);calls.push({path:u.pathname+u.search,method:init.method||'GET'});
    if(u.pathname.endsWith('/cgma_festival_2026_coupon_public'))return Response.json(rows);
    if(u.pathname.endsWith('/cgma_festival_2026_settings'))return Response.json([{booth_open:true,coupon_open:true}]);
    if(u.pathname==='/auth/v1/user')return new Response('{}',{status:401});
    return new Response('{"message":"unexpected"}',{status:500});
  };
  return {calls,handler:createHandler({projectUrl:'https://p.test',serviceKey:'svc',anonKey:'anon',fetchImpl})};
}
const get=(route,origin='https://cgma.or.kr')=>new Request(EDGE+route,{headers:origin?{origin}:{}});

test('public list exposes only shopName/location/items even if the backend returned more',async()=>{
  const {handler,calls}=backend();
  const res=await handler(get('public/coupon-merchants'));
  assert.equal(res.status,200);
  const text=await res.text();const body=JSON.parse(text);
  assert.equal(body.count,1);
  assert.deepEqual(Object.keys(body.merchants[0]).sort(),['items','location','shopName']);
  assert.doesNotMatch(text,/010|receipt|phone/);
  assert.match(calls[0].path,/cgma_festival_2026_coupon_public\?select=shop_name,location_text,items/);
  assert.equal(res.headers.get('cache-control'),'public, max-age=60');
  assert.equal(res.headers.get('access-control-allow-origin'),'https://cgma.or.kr');
});
test('public list needs no login and never touches auth or admin tables',async()=>{
  const {handler,calls}=backend([]);
  const body=await (await handler(get('public/coupon-merchants',''))).json();
  assert.equal(body.ok,true);assert.equal(body.count,0);
  assert.ok(calls.every(c=>c.path.includes('coupon_public')));
});
test('backend failure returns 503 without leaking details',async()=>{
  const handler=createHandler({projectUrl:'https://p.test',serviceKey:'svc',anonKey:'anon',fetchImpl:async()=>new Response('{"message":"boom secret"}',{status:500})});
  const res=await handler(get('public/coupon-merchants'));
  assert.equal(res.status,503);assert.doesNotMatch(await res.text(),/secret/);
});
test('admin routes still require an administrator',async()=>{
  const {handler}=backend();
  assert.equal((await handler(get('admin/coupon'))).status,403);
});
test('public page uses only the public endpoint and renders with textContent',()=>{
  const page=readFileSync('festival/2026/coupon/merchants/index.html','utf8');
  const script=page.slice(page.indexOf('<script>'));
  assert.match(script,/\/public\/coupon-merchants/);
  assert.doesNotMatch(script,/admin\/|innerHTML|phone|receipt/i);
  assert.match(page,/개인정보는 공개하지 않습니다/);
  assert.match(readFileSync('festival/2026/coupon/index.html','utf8'),/href="merchants\/"/);
});
