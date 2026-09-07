import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeExperiment,experimentMetricForAction} from './store-experiment-model.mjs';
const row=(day,detail=0,directions=0,recommend=0,benefit=0)=>({day,detail_open:detail,directions_click:directions,recommendation_click:recommend,benefit_click:benefit});
test('maps public-card actions to a measurable metric',()=>{assert.equal(experimentMetricForAction('benefit'),'benefit_click');assert.equal(experimentMetricForAction('publish-card'),'detail_open');assert.equal(experimentMetricForAction('verify-menu'),null)});
test('compares equal windows after a change',()=>{const daily=[row('2026-09-05',2),row('2026-09-06',2),row('2026-09-07',2),row('2026-09-08',4),row('2026-09-09',4),row('2026-09-10',4)];const result=summarizeExperiment({experiment:{start_day:'2026-09-08',metric:'detail_open'},daily,to:'2026-09-10'});assert.equal(result.before,6);assert.equal(result.after,12);assert.equal(result.key,'improved')});
test('holds judgement for tiny or very early samples',()=>{const result=summarizeExperiment({experiment:{start_day:'2026-09-08',metric:'benefit_click'},daily:[row('2026-09-08',0,0,0,1)],to:'2026-09-09'});assert.equal(result.key,'measuring');assert.match(result.detail,/최소 3일/)});
