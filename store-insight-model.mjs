const TYPES=['detail_open','directions_click','recommendation_click','benefit_click'];
const zero=()=>Object.fromEntries(TYPES.map(type=>[type,0]));
const add=(target,row)=>{for(const type of TYPES)target[type]+=Number(row?.[type]||0);return target};
const total=value=>TYPES.reduce((sum,type)=>sum+Number(value?.[type]||0),0);
function shiftDay(day,offset){const [y,m,d]=String(day).split('-').map(Number),date=new Date(Date.UTC(y,m-1,d+offset));return date.toISOString().slice(0,10)}
function windowTotals(daily,to,startOffset,endOffset){
 const byDay=new Map((daily||[]).map(row=>[row.day,row]));
 const result=zero();
 for(let offset=startOffset;offset<=endOffset;offset++)add(result,byDay.get(shiftDay(to,offset)));
 return result;
}
function trendFor(recent,previous){
 const now=total(recent),before=total(previous);
 if(now<5)return {key:'learning',label:'반응을 더 모으는 중',detail:'아직 표본이 적어 증가·감소를 단정하지 않습니다.'};
 if(before===0)return {key:'new',label:'새 반응이 생기고 있어요',detail:`최근 7일 ${now}건의 익명 반응이 확인됐습니다.`};
 const change=(now-before)/before;
 if(change>=.25)return {key:'up',label:'최근 반응이 늘고 있어요',detail:`직전 7일보다 약 ${Math.round(change*100)}% 늘었습니다.`};
 if(change<=-.25)return {key:'down',label:'최근 반응이 줄었어요',detail:`직전 7일보다 약 ${Math.abs(Math.round(change*100))}% 줄었습니다.`};
 return {key:'steady',label:'최근 반응이 안정적이에요',detail:'직전 7일과 비슷한 수준의 반응이 이어지고 있습니다.'};
}function actionFor(recent){
 const now=total(recent);
 if(now<5)return '가게 소개·영업시간·대표 메뉴와 혜택을 최신 상태로 두고 반응을 조금 더 모아보세요.';
 const {detail_open:detail,directions_click:directions,recommendation_click:recommend,benefit_click:benefit}=recent;
 if(directions>=Math.max(detail,recommend,benefit))return '방문 의도가 보입니다. 영업시간, 위치, 주차·픽업 안내가 정확한지 한 번 확인해 보세요.';
 if(detail>=directions*2&&detail>=benefit)return '상세 관심에 비해 길찾기가 적습니다. 대표 메뉴·가격·혜택과 방문 정보를 더 선명하게 보여주세요.';
 if(benefit>=Math.max(3,directions))return '혜택 반응이 좋습니다. 혜택 설명에 이용 조건과 길찾기·방문 정보를 함께 연결해 보세요.';
 if(recommend>=Math.max(detail,directions,benefit))return '추천에서 관심이 들어오고 있습니다. 공개 가게 소개와 대표 이미지를 최신 상태로 유지해 주세요.';
 return '현재 반응 흐름은 고르게 이어지고 있습니다. 가게 정보와 혜택을 최신 상태로 유지해 주세요.';
}
export function summarizeInsights(data={}){
 const to=data.to||new Date().toISOString().slice(0,10),daily=Array.isArray(data.daily)?data.daily:[];
 const recent=windowTotals(daily,to,-6,0),previous=windowTotals(daily,to,-13,-7),trend=trendFor(recent,previous);
 return {recent,previous,recentTotal:total(recent),previousTotal:total(previous),trend,action:actionFor(recent),period:`${shiftDay(to,-6)} ~ ${to}`};
}
export const insightEventTypes=TYPES.slice();