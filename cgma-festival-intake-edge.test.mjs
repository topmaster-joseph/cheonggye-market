// Node tests for the cgma-festival-intake Edge Function handler (v3) with a fake PostgREST/Auth backend.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,csvCell,couponCsv,formatPhone,kst} from './supabase/functions/cgma-festival-intake/handler.js';

const BASE='https://example.supabase.co';
const FN=BASE+'/functions/v1/cgma-festival-intake/';
const ORIGIN='https://cgma.or.kr';
const R1='00000000-0000-4000-8000-000000000001', R2='00000000-0000-4000-8000-000000000002';
const ADMIN_ID='11111111-1111-4111-8111-111111111111';

function backend({authority='tenant',couponOpen=true,rpcError=null}={}){
  const calls=[];
  const rows=[
    {receipt:R1,shop_name:'승인상점',phone:'01012345678',location_text:'청계면 1',items:'커피',review_state:'approved',created_at:'2026-10-17T00:00:00Z',updated_at:'2026-10-18T00:00:00Z'},
    {receipt:R2,shop_name:'=HYPERLINK("x")',phone:'01099998888',location_text:'청계면 2, 1층',items:'분식 "특가"',review_state:'pending',created_at:'2026-10-16T23:00:00Z',updated_at:'2026-10-16T23:00:00Z'}
  ];
  const history=[
    {receipt:R1,event:'submitted',from_state:null,to_state:'pending',actor_email:null,created_at:'2026-10-17T00:00:00Z'},
    {receipt:R1,event:'review',from_state:'pending',to_state:'approved',actor_email:'admin@example.org',created_at:'2026-10-18T00:00:00Z'}
  ];
  const fetch=async(url,init={})=>{
    const u=new URL(url);calls.push({path:u.pathname+u.search,method:init.method||'GET',body:init.body,headers:init.headers});
    const ok=(v,s=200)=>new Response(JSON.stringify(v),{status:s,headers:{'content-type':'application/json'}});
    if(u.pathname==='/auth/v1/user') return init.headers.Authorization==='Bearer good'?ok({id:ADMIN_ID,email:'admin@example.org'}):ok({msg:'bad'},401);
    if(u.pathname==='/functions/v1/membership-api/pending') return ok({reviewer:authority?{authority}:null});
    if(u.pathname.endsWith('/cgma_festival_2026_settings')&&(init.method||'GET')==='GET') return ok([{booth_open:true,coupon_open:couponOpen}]);
    if(u.pathname.endsWith('/cgma_festival_2026_coupon_public')) return ok([{shop_name:'승인상점',location_text:'청계면 1',items:'커피'}]);
    if(u.pathname.endsWith('/cgma_festival_2026_coupon_merchant')&&init.method==='POST') return ok([{receipt:R1}],201);
    if(u.pathname.endsWith('/cgma_festival_2026_coupon_merchant')) return ok(rows);
    if(u.pathname.endsWith('/cgma_festival_2026_coupon_review_log')) return ok(history);
    if(u.pathname.endsWith('/rpc/cgma_festival_2026_coupon_review')) return rpcError?ok({code:'P0001',message:rpcError},400):ok({ok:true,changed:true});
    return ok({message:'unexpected '+u.pathname},500);
  };
  return {calls,handler:createHandler({projectUrl:BASE,serviceKey:'svc',anonKey:'anon',fetch,now:()=>Date.parse('2026-10-19T10:00:00Z')})};
}
const req=(route,{method='GET',origin=ORIGIN,auth,body}={})=>new Request(FN+route,{method,
  headers:{...(origin?{origin}:{}),...(auth?{authorization:'Bearer '+auth}:{}),...(body?{'content-type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})});

test('public coupon list returns only shop, location and items — no phone/receipt/PII',async()=>{
  const {handler,calls}=backend();
  const res=await handler(req('public/coupon-merchants'));
  assert.equal(res.status,200);
  const text=await res.text();const body=JSON.parse(text);
  assert.equal(body.count,1);
  assert.deepEqual(Object.keys(body.merchants[0]).sort(),['items','location','shopName']);
  assert.doesNotMatch(text,/010|receipt|phone|privacy|actor/i);
  assert.match(calls.at(-1).path,/cgma_festival_2026_coupon_public\?select=shop_name,location_text,items/);
  assert.match(res.headers.get('cache-control'),/public, max-age=60/);
});
test('public list needs no auth and never calls the admin authorizer',async()=>{
  const {handler,calls}=backend();
  await handler(req('public/coupon-merchants',{origin:''}));
  assert.ok(!calls.some(c=>c.path.startsWith('/auth/')||c.path.includes('membership-api')));
});
test('CSV download is admin-only',async()=>{
  const {handler}=backend();
  assert.equal((await handler(req('admin/coupon.csv'))).status,403);
  assert.equal((await handler(req('admin/coupon.csv',{auth:'bad'}))).status,403);
  const {handler:noRole}=backend({authority:null});
  assert.equal((await noRole(req('admin/coupon.csv',{auth:'good'}))).status,403);
});
test('CSV has BOM, Korean header, full phone for admins, oldest-first, formula-safe cells, last actor',async()=>{
  const {handler}=backend();
  const res=await handler(req('admin/coupon.csv',{auth:'good'}));
  assert.equal(res.status,200);
  assert.match(res.headers.get('content-type'),/text\/csv; charset=utf-8/);
  assert.equal(res.headers.get('content-disposition'),'attachment; filename="cgma-coupon-merchants-20261019.csv"');
  assert.equal(res.headers.get('access-control-allow-origin'),ORIGIN);
  const buf=new Uint8Array(await res.arrayBuffer());
  assert.deepEqual([...buf.slice(0,3)],[0xEF,0xBB,0xBF]);
  const lines=new TextDecoder().decode(buf).replace(/^﻿/,'').trim().split('\r\n');
  assert.equal(lines.length,3);
  assert.match(lines[0],/^번호,접수번호,상호,연락처/);
  assert.match(lines[1],/^1,00000000-0000-4000-8000-000000000002,"'=HYPERLINK\(""x""\)",010-9999-8888,"청계면 2, 1층","분식 ""특가""",검토 대기,미확정,2026-10-17 08:00,,$/);
  assert.match(lines[2],/^2,.*승인상점,010-1234-5678,.*참여 승인,가능,2026-10-17 09:00,2026-10-18 09:00,admin@example.org$/);
});
test('admin list now includes review history',async()=>{
  const {handler}=backend();
  const body=await (await handler(req('admin/coupon',{auth:'good'}))).json();
  assert.equal(body.ok,true);assert.equal(body.items.length,2);assert.equal(body.history.length,2);
});
test('review goes through the atomic RPC with the authenticated actor',async()=>{
  const {handler,calls}=backend();
  const res=await handler(req('admin/action',{method:'POST',auth:'good',body:{kind:'coupon',action:'review',receipt:R2,state:'approved'}}));
  assert.equal(res.status,200);
  const rpc=calls.find(c=>c.path.endsWith('/rpc/cgma_festival_2026_coupon_review'));
  assert.deepEqual(JSON.parse(rpc.body),{p_receipt:R2,p_state:'approved',p_actor_id:ADMIN_ID,p_actor_email:'admin@example.org'});
  assert.ok(!calls.some(c=>c.method==='PATCH'&&c.path.includes('coupon_merchant')),'must not bypass RPC');
});
test('review rejects bad state/receipt and maps not_found',async()=>{
  const {handler}=backend();
  assert.equal((await handler(req('admin/action',{method:'POST',auth:'good',body:{kind:'coupon',action:'review',receipt:R2,state:'bogus'}}))).status,400);
  assert.equal((await handler(req('admin/action',{method:'POST',auth:'good',body:{kind:'coupon',action:'review',receipt:'x',state:'approved'}}))).status,400);
  const {handler:h404}=backend({rpcError:'not_found'});
  assert.equal((await h404(req('admin/action',{method:'POST',auth:'good',body:{kind:'coupon',action:'review',receipt:R2,state:'approved'}}))).status,404);
  assert.equal((await handler(req('admin/action',{method:'POST',auth:'good',origin:'https://evil.example',body:{kind:'coupon',action:'review',receipt:R2,state:'approved'}}))).status,403);
});
test('v2 regression: status, apply validation, honeypot, closed intake, CORS preflight',async()=>{
  const {handler}=backend();
  const s=await (await handler(req('status'))).json();
  assert.deepEqual([s.ok,s.couponOpen,s.couponValue],[true,true,5000]);
  assert.equal((await handler(req('apply/coupon',{method:'POST',body:{}}))).status,400);
  assert.equal((await handler(req('apply/coupon',{method:'POST',origin:'https://evil.example',body:{}}))).status,403);
  const good={shop:'새 상점',phone:'010-1111-2222',location:'청계면',items:'빵',couponAcceptance:true,privacyConsent:true,website:''};
  assert.equal((await handler(req('apply/coupon',{method:'POST',body:good}))).status,201);
  assert.equal((await handler(req('apply/coupon',{method:'POST',body:{...good,website:'spam'}}))).status,400);
  const {handler:closed}=backend({couponOpen:false});
  assert.equal((await closed(req('apply/coupon',{method:'POST',body:good}))).status,409);
  const pre=await handler(req('admin/coupon.csv',{method:'OPTIONS'}));
  assert.equal(pre.status,204);assert.match(pre.headers.get('access-control-expose-headers'),/content-disposition/);
  assert.equal((await handler(req('nope'))).status,404);
});
test('helpers',()=>{
  assert.equal(csvCell('+82'),"'+82");assert.equal(csvCell('@sum'),"'@sum");assert.equal(csvCell('a,b'),'"a,b"');
  assert.equal(formatPhone('0613331234'),'061-333-1234');assert.equal(formatPhone('0212345678'),'02-1234-5678');
  assert.equal(kst('2026-10-19T15:30:00Z'),'2026-10-20 00:30');
  assert.match(couponCsv([],[]),/^﻿번호/);
});
