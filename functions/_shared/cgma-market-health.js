const TYPES=['detail_open','directions_click','recommendation_click','benefit_click'];
const zero=()=>Object.fromEntries(TYPES.map(type=>[type,0]));
const total=v=>TYPES.reduce((sum,type)=>sum+Number(v?.[type]||0),0);
function shiftDay(day,offset){const [y,m,d]=String(day).split('-').map(Number),date=new Date(Date.UTC(y,m-1,d+offset));return date.toISOString().slice(0,10)}
function add(target,type,count){if(type in target)target[type]+=Number(count||0)}
export function summarizeMarketHealth(rows=[],experiments=[],to){
 const end=to||new Date().toISOString().slice(0,10),recentFrom=shiftDay(end,-6),previousFrom=shiftDay(end,-13),previousTo=shiftDay(end,-7),stores=new Map();
 for(const row of rows){const key=String(row.store_key||'').trim();if(!key)continue;const item=stores.get(key)||{key,name:row.store_name||key,recent:zero(),previous:zero()};if(row.day>=recentFrom&&row.day<=end)add(item.recent,row.event_type,row.count);else if(row.day>=previousFrom&&row.day<=previousTo)add(item.previous,row.event_type,row.count);stores.set(key,item)}
 const activeExperiments=new Set((experiments||[]).filter(x=>x.status==='active').map(x=>x.store_key));
 const items=[...stores.values()].map(item=>{const recentTotal=total(item.recent),previousTotal=total(item.previous);let state='learning',change=null;if(recentTotal>=5){if(previousTotal===0)state='rising';else{change=(recentTotal-previousTotal)/previousTotal;state=change>=.25?'rising':change<=-.25?'watch':'steady'}}const signals=[];if(state==='watch')signals.push('최근 반응 감소');if(item.recent.detail_open>=5&&item.recent.directions_click===0)signals.push('상세 관심 대비 길찾기 없음');if(item.recent.benefit_click>=3&&item.recent.directions_click===0)signals.push('혜택 반응 후 방문 연결 확인');if(activeExperiments.has(item.key))signals.push('개선 실험 진행 중');return {...item,recentTotal,previousTotal,state,change,signals,experimentActive:activeExperiments.has(item.key)}});
 const recentItems=items.filter(x=>x.recentTotal>0),summary={activeStores:recentItems.length,totalRecent:recentItems.reduce((s,x)=>s+x.recentTotal,0),directions:recentItems.reduce((s,x)=>s+x.recent.directions_click,0),benefits:recentItems.reduce((s,x)=>s+x.recent.benefit_click,0),rising:recentItems.filter(x=>x.state==='rising').length,watch:recentItems.filter(x=>x.state==='watch').length,experiments:items.filter(x=>x.experimentActive).length};
 const intervention=items.filter(x=>x.signals.length).sort((a,b)=>Number(b.state==='watch')-Number(a.state==='watch')||b.signals.length-a.signals.length||b.recentTotal-a.recentTotal).slice(0,8);
 return {to:end,recentFrom,previousFrom,previousTo,summary,stores:items.sort((a,b)=>b.recentTotal-a.recentTotal),intervention};
}
