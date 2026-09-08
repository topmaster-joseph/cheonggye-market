import test from 'node:test';
import assert from 'node:assert/strict';
import {playbookForSignals,reviewState} from './functions/_shared/cgma-intervention-playbook.js';
test('prioritizes benefit to visit bridge',()=>assert.equal(playbookForSignals(['최근 반응 감소','혜택 반응 후 방문 연결 확인']).key,'benefit_bridge'));
test('suggests visit information when detail interest has no directions',()=>assert.equal(playbookForSignals(['상세 관심 대비 길찾기 없음']).key,'visit_gap'));
test('does not stack a new playbook onto an active experiment',()=>assert.equal(playbookForSignals(['개선 실험 진행 중']).startable,false));
test('marks active cards ready only after review day',()=>{assert.equal(reviewState({status:'active',review_day:'2026-09-15'},'2026-09-14'),'active');assert.equal(reviewState({status:'active',review_day:'2026-09-15'},'2026-09-15'),'review_ready')});
