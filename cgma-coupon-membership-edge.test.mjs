import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('./supabase/functions/cgma-festival-intake/index.ts',import.meta.url),'utf8');
const origin='https://ekodi.kr';
const receipt='00000000-0000-4000-8000-000000000001';
const shop={shop:'테스트상점',phone:'01012345678',location:'청계면 가상주소',items:'상품',privacyConsent:true,couponAcceptance:true,website:''};

function boot(){
 const calls=[];
 let handler;
 const mockFetch=async (url,options={})=>{
  const target=String(url);
  calls.push({url:target,method:options.method||'GET',body:options.body});
  if(target.includes('/rest/v1/cgma_festival_2026_settings?'))return Response.json([{booth_open:true,coupon_open:true}]);
  if(target.includes('/rest/v1/cgma_festival_2026_coupon_merchant?')&&options.method==='POST')
   return Response.json([{receipt}]);
  if(target.includes('/rest/v1/cgma_festival_2026_coupon_merchant?')&&(!options.method||options.method==='GET'))
   return Response.json([{receipt,shop_name:shop.shop,phone:shop.phone,location_text:shop.location,items:shop.items,membership_choice:'joining',review_state:'pending',created_at:'2026-10-17'}]);
  if(target.endsWith('/auth/v1/user'))return Response.json({id:'synthetic-user'});
  if(target.includes('/functions/v1/membership-api/pending?'))return Response.json({reviewer:{authority:'tenant'}});
  throw Error('Unexpected mock call: '+target);
 };
 vm.runInNewContext(source,{
  Deno:{env:{get(key){return ({SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic-secret',SUPABASE_ANON_KEY:'synthetic-anon'})[key]||null}},serve(fn){handler=fn}},
  fetch:mockFetch,Request,Response,Headers,URL,JSON,Date,Set,Error,Number,Array,String
 },{timeout:2000});
 assert.equal(typeof handler,'function');
 return {handler,calls};
}
function post(value){
 return new Request(origin+'/functions/v1/cgma-festival-intake/apply/coupon',{
  method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(value)
 });
}

test('coupon status advertises membership support only when the new Edge source is active',async()=>{
 const {handler}=boot();
 const res=await handler(new Request(origin+'/functions/v1/cgma-festival-intake/status'));
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.couponMembershipEnabled,true);
 assert.equal(data.couponOpen,true);
});

for(const membership of ['regular','joining']){
 test('Edge persists '+membership+' as coupon membership choice, without auto approving',async()=>{
  const {handler,calls}=boot();
  const res=await handler(post({...shop,membership}));
  assert.equal(res.status,201);
  const body=await res.json();
  assert.equal(body.ok,true);
  assert.equal(body.membershipApplicationRequired,membership==='joining');
  const write=calls.find(x=>x.method==='POST'&&x.url.includes('coupon_merchant?'));
  assert.ok(write);
  assert.equal(JSON.parse(write.body).membership_choice,membership);
  assert.equal(JSON.parse(write.body).review_state,undefined);
 });
}

test('invalid membership values cannot write a coupon application',async()=>{
 const {handler,calls}=boot();
 const res=await handler(post({...shop,membership:'admin'}));
 assert.equal(res.status,400);
 assert.equal((await res.json()).error,'membership_required');
 assert.equal(calls.some(x=>x.method==='POST'&&x.url.includes('coupon_merchant?')),false);
});

test('legacy coupon clients remain compatible during a guarded rolling release',async()=>{
 const {handler,calls}=boot();
 const res=await handler(post(shop));
 assert.equal(res.status,201);
 const write=calls.find(x=>x.method==='POST'&&x.url.includes('coupon_merchant?'));
 assert.ok(write);
 assert.equal(Object.hasOwn(JSON.parse(write.body),'membership_choice'),false);
});

test('administrator response includes membership status while unauthenticated access is rejected',async()=>{
 const {handler,calls}=boot();
 const path=origin+'/functions/v1/cgma-festival-intake/admin/coupon';
 const denied=await handler(new Request(path));
 assert.equal(denied.status,403);
 const authorized=await handler(new Request(path,{headers:{authorization:'Bearer synthetic-session'}}));
 assert.equal(authorized.status,200);
 const body=await authorized.json();
 assert.equal(body.items[0].membership_choice,'joining');
 assert.ok(calls.some(x=>x.url.includes('coupon_merchant?select=')&&x.url.includes('membership_choice')));
});
