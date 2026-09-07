const rank={high:3,medium:2,low:1};
const labels={high:'지금',medium:'이번 주',low:'확인'};
const clean=value=>String(value||'').trim();
const activeBenefit=(profile,today)=>Boolean(profile?.today_benefit&&(!profile.benefit_until||profile.benefit_until>=today));
export function buildStoreActions({dashboard={},readiness=null,profile=null,insightsSummary=null,today=new Date().toISOString().slice(0,10)}={}){
  const actions=[],menu=Array.isArray(dashboard.menu)?dashboard.menu:[];
  const pending=menu.filter(item=>item.verification_status==='pending');
  const verified=menu.filter(item=>item.verification_status==='verified'&&item.is_available);
  const add=(priority,key,title,detail,target)=>actions.push({priority,key,title,detail,target,label:labels[priority]});
  if(pending.length)add('high','verify-menu',`가져온 메뉴 ${pending.length}개 확인`,`가격을 확인하면 판매메뉴로 바로 전환할 수 있습니다.`,'pendingMenusCard');
  if(!profile?.is_published)add('high','publish-card','상권지도 공개카드 열기','대표사진·소개·대표메뉴를 공개하면 방문자가 가게를 더 쉽게 이해할 수 있습니다.','publicProfileCard');
  if(!verified.length)add('high','verified-menu','판매메뉴 1개 이상 준비','가격 확인된 판매메뉴가 있어야 주문과 실증 흐름을 안정적으로 열 수 있습니다.','menuManagerCard');
  if(readiness&&!readiness.ready_for_test)add('high','readiness','실증 준비 다음 단계',clean(readiness.next_action)||'준비도 점검에서 남은 항목을 먼저 처리해 주세요.','readinessCard');
  if(profile?.is_published&&(!profile.short_intro||!profile.featured_menu_name||!profile.hero_image_url))add('medium','complete-card','공개카드 핵심정보 채우기','대표사진·한 줄 소개·대표메뉴 중 비어 있는 항목을 채워 가게 이해도를 높여보세요.','publicProfileCard');
  if(profile?.is_published&&!activeBenefit(profile,today))add('medium','benefit','이번 주 혜택 점검','실제 제공 가능한 혜택이 있다면 오늘의 혜택으로 등록해 지도 발견성을 높일 수 있습니다.','publicProfileCard');
  if(insightsSummary?.recentTotal>=5)add('medium','insight-action','반응 데이터에 맞춰 한 가지 개선',clean(insightsSummary.action)||'최근 반응을 바탕으로 공개정보를 한 가지 개선해 보세요.','publicProfileCard');
  if(dashboard.store&&!dashboard.store.order_enabled&&readiness?.ready_for_production)add('low','ordering','온라인 주문 열기 검토','운영 준비가 끝났습니다. 실제 판매 일정에 맞춰 주문을 열지 결정해 주세요.','storeStatusCard');
  const unique=[...new Map(actions.map(action=>[action.key,action])).values()]
    .sort((a,b)=>rank[b.priority]-rank[a.priority]);
  if(!unique.length)add('low','keep-fresh','오늘은 기본정보만 점검','긴급한 작업이 없습니다. 영업시간·대표메뉴·혜택이 최신인지 한 번만 확인해 주세요.','publicProfileCard');
  return (unique.length?unique:actions).slice(0,3);
}
