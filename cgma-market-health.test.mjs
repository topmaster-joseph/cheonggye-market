import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeMarketHealth} from './functions/_shared/cgma-market-health.js';
const r=(store_key,store_name,day,event_type,count)=>({store_key,store_name,day,event_type,count});
test('detects rising and watch stores without ranking people',()=>{const rows=[r('a','가게A','2026-09-08','detail_open',8),r('a','가게A','2026-09-01','detail_open',4),r('b','가게B','2026-09-08','detail_open',3),r('b','가게B','2026-09-01','detail_open',8)];const x=summarizeMarketHealth(rows,[],'2026-09-08');assert.equal(x.summary.rising,1);assert.equal(x.summary.watch,0);assert.equal(x.stores.find(s=>s.key==='b').state,'learning')});
test('flags visit-information gap and active experiment',()=>{const rows=[r('a','가게A','2026-09-08','detail_open',6)];const x=summarizeMarketHealth(rows,[{store_key:'a',status:'active'}],'2026-09-08');assert.ok(x.intervention[0].signals.includes('상세 관심 대비 길찾기 없음'));assert.ok(x.intervention[0].signals.includes('개선 실험 진행 중'));assert.equal(x.summary.experiments,1)});
test('marks a well-sampled decline as watch',()=>{const rows=[r('a','가게A','2026-09-08','detail_open',5),r('a','가게A','2026-09-01','detail_open',10)];const x=summarizeMarketHealth(rows,[],'2026-09-08');assert.equal(x.stores[0].state,'watch');assert.equal(x.summary.watch,1)});
