import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStoreActions} from './store-action-model.mjs';
const base={store:{order_enabled:false},menu:[]};
test('prioritizes pending menu and unpublished card',()=>{
  const actions=buildStoreActions({dashboard:{...base,menu:[{verification_status:'pending',is_available:true}]},readiness:{ready_for_test:false,next_action:'PG 확인'},profile:null,today:'2026-09-08'});
  assert.equal(actions.length,3);
  assert.equal(actions[0].priority,'high');
  assert.ok(actions.some(action=>action.key==='verify-menu'));
  assert.ok(actions.some(action=>action.key==='publish-card'));
});
test('removes completed preparation tasks',()=>{
  const actions=buildStoreActions({dashboard:{store:{order_enabled:true},menu:[{verification_status:'verified',is_available:true}]},readiness:{ready_for_test:true,ready_for_production:true},profile:{is_published:true,short_intro:'소개',featured_menu_name:'메뉴',hero_image_url:'https://example.com/a.jpg',today_benefit:'혜택',benefit_until:'2026-09-09'},today:'2026-09-08'});
  assert.ok(!actions.some(action=>['verify-menu','publish-card','verified-menu','readiness','benefit'].includes(action.key)));
});
