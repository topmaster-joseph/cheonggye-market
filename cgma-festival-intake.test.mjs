import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet,onRequestPost} from './functions/api/festival-booths.js';
import {onRequestGet as adminGet,onRequestPost as adminPost} from './functions/api/festival-booths-admin.js';

const ORIGIN='https://cgma.or.kr';
const input={shop:'청계 테스트 상점',phone:'010-1234-5678',items:'지역 특산품',membership:'regular',privacyConsent:true,website:''};
function db(open=true,changed=1){
 return {async exec(sql){assert.match(sql,/CREATE TABLE IF NOT EXISTS cgma_festival2026_settings/);return [];},prepare(query){
  return {bind(...args){
   return {
    async first(){return {intake_open:open?1:0}},
    async run(){assert.match(query,/INSERT OR IGNORE/);assert.equal(args[2],input.shop);return {meta:{changes:changed}}},
    async all(){return {results:[]}}
   };
  }};
 }};
}
const request=(value,{origin=ORIGIN,method='POST'}={})=>new Request(ORIGIN+'/api/festival-booths',{method,headers:{origin,'content-type':'application/json'},body:JSON.stringify(value)});
test('unavailable DB fails closed for public status and applications',async()=>{
 const status=await onRequestGet({env:{}});assert.equal(status.status,503);
 const apply=await onRequestPost({request:request(input),env:{}});assert.equal(apply.status,503);
});
test('privacy-safe public status reports open without exposing applicants',async()=>{
 const res=await onRequestGet({env:{cheonggye_market_notices:db()}});
 assert.equal(res.status,200);
 const value=await res.json();assert.equal(value.open,true);assert.equal(value.capacity,5);assert.equal(value.deadline,null);
 assert.equal('items' in value,false);
});
test('application enforces origin, consent, radio choice and contact',async()=>{
 const env={cheonggye_market_notices:db()};
 assert.equal((await onRequestPost({request:request(input,{origin:'https://evil.example'}),env})).status,403);
 assert.equal((await onRequestPost({request:request({...input,privacyConsent:false}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...input,membership:'unknown'}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...input,phone:'123'}),env})).status,400);
 assert.equal((await onRequestPost({request:request({...input,website:'bot'}),env})).status,400);
});
test('open intake returns an unguessable receipt and join status',async()=>{
 const env={cheonggye_market_notices:db()};
 const result=await onRequestPost({request:request({...input,membership:'joining'}),env});
 assert.equal(result.status,201);const payload=await result.json();
 assert.match(payload.receipt,/^[0-9a-f-]{36}$/);assert.equal(payload.membershipApplicationRequired,true);
});
test('closed intake and duplicate writes fail without receipts',async()=>{
 const closed=await onRequestPost({request:request(input),env:{cheonggye_market_notices:db(false,0)}});
 assert.equal(closed.status,409);assert.equal((await closed.json()).error,'intake_closed');
 const duplicate=await onRequestPost({request:request(input),env:{cheonggye_market_notices:db(true,0)}});
 assert.equal(duplicate.status,409);assert.equal((await duplicate.json()).error,'duplicate_application');
});
test('admin routes fail closed without authentication',async()=>{
 assert.equal((await adminGet({request:new Request(ORIGIN+'/api/festival-booths-admin'),env:{}})).status,401);
 assert.equal((await adminPost({request:request(input),env:{}})).status,401);
});
test('schema and admission SQL protect capacity, tenant and applicant privacy',()=>{
 const admin=readFileSync('functions/api/festival-booths-admin.js','utf8');
 const migration=readFileSync('migrations/20261016_cgma_festival_booths.sql','utf8');
 assert.match(admin,/membership_verified=1/);
 assert.match(admin,/selection_state='selected'\)<5/);
 assert.match(admin,/cgmaAdmin/);
 assert.match(migration,/UNIQUE\(event_id,shop_name,phone\)/);
 assert.match(migration,/CHECK\(event_id='cgma-du-dream-2026'\)/);
});
