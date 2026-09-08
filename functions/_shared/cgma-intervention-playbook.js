export const PLAYBOOKS={
  benefit_bridge:{key:'benefit_bridge',title:'혜택→방문 전환 점검',objective:'혜택 문구와 만료일, 지도·길찾기 연결을 함께 확인합니다.',metric:'directions_click',startable:true},
  visit_gap:{key:'visit_gap',title:'방문정보 연결 점검',objective:'지도 위치, 주소, 대표전화와 방문 동선을 확인해 길찾기 진입을 분명히 합니다.',metric:'directions_click',startable:true},
  recovery:{key:'recovery',title:'점포 공개카드 리프레시',objective:'대표사진·대표메뉴·소개·혜택 중 실제로 바뀐 정보를 최신화합니다.',metric:'all',startable:true},
  experiment_review:{key:'experiment_review',title:'진행 중 실험 점검',objective:'새 개입을 겹치지 않고 현재 실험의 종료 조건과 관찰기간을 먼저 확인합니다.',metric:'all',startable:false},
  observe:{key:'observe',title:'데이터 관찰 계속',objective:'표본이 더 쌓일 때까지 별도 개입 없이 익명 반응을 관찰합니다.',metric:'all',startable:false}
};
export function playbookForSignals(signals=[]){const set=new Set(signals);if(set.has('혜택 반응 후 방문 연결 확인'))return PLAYBOOKS.benefit_bridge;if(set.has('상세 관심 대비 길찾기 없음'))return PLAYBOOKS.visit_gap;if(set.has('최근 반응 감소'))return PLAYBOOKS.recovery;if(set.has('개선 실험 진행 중'))return PLAYBOOKS.experiment_review;return PLAYBOOKS.observe;}
export function reviewState(row,today){if(!row||row.status!=='active')return 'closed';return String(today||'')>=String(row.review_day||'9999-12-31')?'review_ready':'active';}
