const TYPES=['detail_open','directions_click','recommendation_click','benefit_click'];
const totalRow=row=>TYPES.reduce((sum,type)=>sum+Number(row?.[type]||0),0);
const metricValue=(row,metric)=>metric==='all'?totalRow(row):Number(row?.[metric]||0);
function shiftDay(day,offset){const [y,m,d]=String(day).split('-').map(Number),date=new Date(Date.UTC(y,m-1,d+offset));return date.toISOString().slice(0,10)}
function dayDiff(from,to){const a=new Date(`${from}T00:00:00Z`),b=new Date(`${to}T00:00:00Z`);return Math.floor((b-a)/86400000)}
function sumWindow(daily,from,to,metric){const rows=new Map((daily||[]).map(row=>[row.day,row]));let sum=0;for(let day=from;day<=to;day=shiftDay(day,1))sum+=metricValue(rows.get(day),metric);return sum;}
export const experimentMetricForAction=actionKey=>({benefit:'benefit_click','publish-card':'detail_open','complete-card':'detail_open','insight-action':'all'}[actionKey]||null);
export const experimentMetricLabel=metric=>({all:'전체 반응',detail_open:'상세 열기',directions_click:'길찾기',recommendation_click:'추천 클릭',benefit_click:'혜택 클릭'}[metric]||'반응');
export function summarizeExperiment({experiment,daily=[],to}={}){
 if(!experiment?.start_day)return null;
 const metric=experiment.metric||'all',end=experiment.end_day&&experiment.end_day<(to||experiment.end_day)?experiment.end_day:(to||experiment.start_day),elapsed=Math.max(1,Math.min(7,dayDiff(experiment.start_day,end)+1));
 const afterFrom=experiment.start_day,afterTo=shiftDay(afterFrom,elapsed-1),beforeTo=shiftDay(afterFrom,-1),beforeFrom=shiftDay(beforeTo,-elapsed+1);
 const after=sumWindow(daily,afterFrom,afterTo,metric),before=sumWindow(daily,beforeFrom,beforeTo,metric),evidence=after+before;
 const base={metric,metricLabel:experimentMetricLabel(metric),elapsed,before,after,beforeFrom,beforeTo,afterFrom,afterTo};
 if(elapsed<3||evidence<5)return {...base,key:'measuring',label:'효과를 측정하는 중',detail:`${elapsed}일차입니다. 최소 3일과 충분한 반응이 쌓인 뒤 비교합니다.`};
 if(before===0)return after>=5?{...base,key:'new',label:'새 반응이 확인됐어요',detail:`변경 후 ${after}건의 ${experimentMetricLabel(metric)}이 확인됐습니다.`}:{...base,key:'measuring',label:'효과를 더 관찰하는 중',detail:'비교 기준 반응이 없어 조금 더 데이터를 모읍니다.'};
 const change=(after-before)/before,pct=Math.round(Math.abs(change)*100);
 if(change>=.25)return {...base,key:'improved',label:'개선 신호가 보여요',detail:`같은 기간 대비 ${experimentMetricLabel(metric)}이 약 ${pct}% 늘었습니다.`};
 if(change<=-.25)return {...base,key:'declined',label:'추가 확인이 필요해요',detail:`같은 기간 대비 ${experimentMetricLabel(metric)}이 약 ${pct}% 줄었습니다.`};
 return {...base,key:'steady',label:'큰 변화는 아직 없어요',detail:'같은 기간과 비슷한 수준입니다. 한 번에 한 요소만 바꿔 조금 더 관찰해 보세요.'};
}
