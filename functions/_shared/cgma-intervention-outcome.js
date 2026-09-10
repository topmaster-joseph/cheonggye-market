const LABELS={collecting:'관찰 중',effective:'효과 있음',inconclusive:'아직 판단 이르다',redesign:'재설계 필요',cancelled:'취소됨'};
const metricValue=(metric,totals={})=>metric==='directions_click'?Number(totals.directions_click||totals.directions||0):metric==='benefit_click'?Number(totals.benefit_click||totals.benefits||0):Number(totals.total||0);
const pct=value=>`${Math.round(Math.abs(value)*100)}%`;
export function evaluateInterventionOutcome({baseline={},current={},metric='all',today='',review_day='',status='active'}={}){
 const before=metricValue(metric,baseline),after=metricValue(metric,current),sample=before+after,ready=String(today)>=String(review_day||'9999-12-31');
 if(status==='cancelled')return {state:'cancelled',label:LABELS.cancelled,before,after,change:null,recommendation:null,reason:'관리자가 운영카드를 취소했습니다.'};
 if(!ready)return {state:'collecting',label:LABELS.collecting,before,after,change:null,recommendation:null,reason:'7일 검토일까지 익명 반응을 모으는 중입니다.'};
 if(before===0){if(after>=5)return {state:'effective',label:LABELS.effective,before,after,change:null,recommendation:'keep',reason:'시작 전 없던 목표 반응이 검토기간에 충분히 발생했습니다.'};return {state:'inconclusive',label:LABELS.inconclusive,before,after,change:null,recommendation:'iterate',reason:'목표 반응 표본이 아직 작아 효과를 단정하지 않습니다.'};}
 const change=(after-before)/before;if(sample<8||after<3)return {state:'inconclusive',label:LABELS.inconclusive,before,after,change,recommendation:'iterate',reason:'비교 표본이 아직 작아 증가·감소를 단정하지 않습니다.'};
 if(change>=.25)return {state:'effective',label:LABELS.effective,before,after,change,recommendation:'keep',reason:`목표 반응이 시작 전보다 약 ${pct(change)} 늘었습니다.`};
 if(change<=-.25&&sample>=12)return {state:'redesign',label:LABELS.redesign,before,after,change,recommendation:'iterate',reason:`목표 반응이 시작 전보다 약 ${pct(change)} 줄었습니다. 같은 개입을 반복하기보다 내용을 다시 설계하는 편이 좋습니다.`};
 return {state:'inconclusive',label:LABELS.inconclusive,before,after,change,recommendation:'iterate',reason:'변화가 판단 기준보다 작아 효과를 단정하지 않습니다.'};
}
export function outcomeMetricLabel(metric){return metric==='directions_click'?'길찾기':metric==='benefit_click'?'혜택 반응':'전체 반응';}
