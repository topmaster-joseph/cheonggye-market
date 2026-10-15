import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet as getBooth,onRequestPost as postBooth} from './functions/api/festival-booths.js';
import {onRequestGet as getCoupon,onRequestPost as postCoupon} from './functions/api/festival-coupon-merchants.js';
import {onRequestGet as getAdminBooth,onRequestPost as postAdminBooth} from './functions/api/festival-booths-admin.js';
import {onRequestGet as getAdminCoupon,onRequestPost as postAdminCoupon} from './functions/api/festival-coupon-merchants-admin.js';
const ORIGIN='https://cgma.or.kr';
const request=(url,value,origin=ORIGIN)=>new Request(ORIGIN+url,{
 method:'POST',headers:{origin,'content-type':'application/json'},
 body:JSON.stringify(value)
});
const input={shop:'청계 검증 상점',phone:'010-1234-5678',items:'생활용품',membership:'regular',privacyConsent:true,website:''};
const fetchSpy=(answer={ok:true,boothOpen:true,couponOpen:true,receipt:'00000000-0000-4000-8000-000000000001'})=>{
 const calls=[];
 return {calls,fetcher:async (url,init)=>{
  calls.push({url,method:init.method,body:init.body,headers:init.headers});
  return Response.json(answer,{status:answer.ok===false?503:200});
 }};
};
test('public GET resolves two independently controlled application states',async()=>{
 const spy=fetchSpy({ok:true,boothOpen:true,couponOpen:false});
 const env={FESTIVAL_TEST_FETCH:spy.fetcher};
 const booth=await getBooth({request:new Request(ORIGIN+'/api/festival-booths'),env});
 const coupon=await getCoupon({request:new Request(ORIGIN+'/api/festival-coupon-merchants'),env});
 assert.equal((await booth.json()).open,true);
 const value=await coupon.json();assert.equal(value.open,false);assert.equal(value.couponValue,5000);
 assert.deepEqual(spy.calls.map(x=>x.method),['GET','GET']);
});
test('new coupon form posts only to the dedicated coupon intake backend',async()=>{
 const spy=fetchSpy();
 const value={...input,location:'청계면 후문길 10',couponAcceptance:true};
 const result=await postCoupon({request:request('/api/festival-coupon-merchants',value),env:{FESTIVAL_TEST_FETCH:spy.fetcher}});
 assert.equal(result.status,200);
 assert.match(spy.calls[0].url,/\/apply\/coupon$/);
 assert.equal(JSON.parse(spy.calls[0].body).location,'청계면 후문길 10');
});
test('booth and coupon must not cross-write',async()=>{
 const spy=fetchSpy();
 await postBooth({request:request('/api/festival-booths',input),env:{FESTIVAL_TEST_FETCH:spy.fetcher}});
 assert.match(spy.calls[0].url,/\/apply\/booth$/);
 assert.equal(JSON.parse(spy.calls[0].body).membership,'regular');
});
test('missing and foreign origins never forward submissions',async()=>{
 const spy=fetchSpy();
 const denied=await postCoupon({request:request('/api/festival-coupon-merchants',input,'https://bad.example'),env:{FESTIVAL_TEST_FETCH:spy.fetcher}});
 assert.equal(denied.status,403);
 assert.equal(spy.calls.length,0);
});
test('both admin endpoints fail closed without Bearer session',async()=>{
 const env={FESTIVAL_TEST_FETCH:fetchSpy().fetcher};
 assert.equal((await getAdminBooth({request:new Request(ORIGIN+'/api/festival-booths-admin'),env})).status,401);
 assert.equal((await getAdminCoupon({request:new Request(ORIGIN+'/api/festival-coupon-merchants-admin'),env})).status,401);
 assert.equal((await postAdminBooth({request:request('/api/festival-booths-admin',{action:'set_intake',open:false}),env})).status,401);
 assert.equal((await postAdminCoupon({request:request('/api/festival-coupon-merchants-admin',{action:'set_intake',open:false}),env})).status,401);
});
test('admin sends scoped payloads and preserved bearer token to Edge authorizer',async()=>{
 const spy=fetchSpy();
 const req=new Request(ORIGIN+'/api/festival-coupon-merchants-admin',{method:'POST',headers:{origin:ORIGIN,authorization:'Bearer test-admin-jwt','content-type':'application/json'},body:JSON.stringify({action:'review',receipt:'00000000-0000-4000-8000-000000000001',state:'approved'})});
 const res=await postAdminCoupon({request:req,env:{FESTIVAL_TEST_FETCH:spy.fetcher}});
 assert.equal(res.status,200);
 assert.equal(spy.calls[0].headers.authorization,'Bearer test-admin-jwt');
 assert.deepEqual(JSON.parse(spy.calls[0].body),{kind:'coupon',action:'review',receipt:'00000000-0000-4000-8000-000000000001',state:'approved'});
});
test('site menus link both standalone paths, admin restricts PII',()=>{
 const home=readFileSync('index.html','utf8');
 const admin=readFileSync('admin/index.html','utf8');
 const panel=readFileSync('admin-dashboard.js','utf8');
 const coupon=readFileSync('festival/2026/coupon/index.html','utf8');
 assert.match(home,/festival\/2026\/coupon\//);
 assert.match(home,/festival\/2026\/apply\//);
 assert.match(admin,/id="couponManager"/);
 assert.match(panel,/couponManager/);
 assert.match(coupon,/5천원 쿠폰/);
 assert.match(coupon,/privacyConsent/);
});


test('both live forms and admin consoles use the verified same EKODI Edge endpoint',()=>{
 const booth=readFileSync('festival/2026/apply/index.html','utf8');
 const coupon=readFileSync('festival/2026/coupon/index.html','utf8');
 const adminBooth=readFileSync('admin-festival.js','utf8');
 const adminCoupon=readFileSync('admin-coupon.js','utf8');
 for(const content of [booth,coupon,adminBooth,adminCoupon])
  assert.match(content,/\/functions\/v1\/cgma-festival-intake/);
 assert.match(booth,/data\.boothOpen===true/);
 assert.match(coupon,/v\.couponOpen===true/);
 assert.match(adminBooth,/admin\/booth/);
 assert.match(adminCoupon,/admin\/coupon/);
});
