import assert from 'node:assert/strict';
import { onRequestGet } from './functions/api/site-mode.js';

async function read(env){
  const response=await onRequestGet({env});
  assert.equal(response.status,200);
  return response.json();
}

const degraded=await read({});
assert.equal(degraded.setting.mode,'normal');
assert.equal(degraded.degraded,true);
assert.equal('forced' in degraded,false);

function dbWith(setting){
  return {prepare(){return {bind(){return {first:async()=>setting}}}}};
}

const normal=await read({cheonggye_market_notices:dbWith({site_key:'cgma',mode:'normal',title:'',message:'',updated_at:'2026-09-09T00:00:00Z'})});
assert.equal(normal.setting.mode,'normal');
assert.equal('forced' in normal,false);

const maintenance=await read({cheonggye_market_notices:dbWith({site_key:'cgma',mode:'maintenance',title:'관리자 지정 점검',message:'잠시 후 다시 이용해 주세요.',updated_at:'2026-09-09T00:00:00Z'})});
assert.equal(maintenance.setting.mode,'maintenance');
assert.equal(maintenance.setting.title,'관리자 지정 점검');
assert.equal('forced' in maintenance,false);

console.log('CGMA site mode contract OK: public by default, admin-controlled maintenance preserved');