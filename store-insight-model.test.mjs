import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeInsights} from './store-insight-model.mjs';
const row=(day,detail=0,directions=0,recommend=0,benefit=0)=>({day,detail_open:detail,directions_click:directions,recommendation_click:recommend,benefit_click:benefit});
test('compares recent 7 days with prior 7 days',()=>{
 const daily=[row('2026-09-07',6,2),row('2026-09-06',4,1),row('2026-08-31',2,1),row('2026-08-30',1)];
 const result=summarizeInsights({to:'2026-09-07',daily});
 assert.equal(result.recentTotal,13);
 assert.equal(result.previousTotal,4);
 assert.equal(result.trend.key,'up');
 assert.match(result.trend.detail,/225%/);
});
test('does not overstate a tiny sample',()=>{
 const result=summarizeInsights({to:'2026-09-07',daily:[row('2026-09-07',2,1)]});
 assert.equal(result.trend.key,'learning');
 assert.match(result.trend.detail,/단정하지 않습니다/);
});
test('suggests visit-information check when directions lead',()=>{
 const result=summarizeInsights({to:'2026-09-07',daily:[row('2026-09-07',1,6,1,1)]});
 assert.match(result.action,/영업시간/);
 assert.match(result.action,/주차/);
});