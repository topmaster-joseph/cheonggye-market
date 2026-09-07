(()=>{
 const $=id=>document.getElementById(id),route=value=>window.CGMA_ROUTE?.route(value)||value;
 const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const labels={rising:'상승 신호',steady:'안정',watch:'관찰 필요',learning:'학습 중'};
 const classFor=state=>['rising','watch','steady'].includes(state)?state:'learning';
 function metric(id,value){const el=$(id);if(el)el.textContent=Number(value||0).toLocaleString('ko-KR')}
 function render(data){const s=data.summary||{};metric('towerActiveStores',s.activeStores);metric('towerInteractions',s.totalRecent);metric('towerDirections',s.directions);metric('towerBenefits',s.benefits);metric('towerRising',s.rising);metric('towerWatch',s.watch);metric('towerExperiments',s.experiments);const period=$('towerPeriod');if(period)period.textContent=`${data.recentFrom||''} ~ ${data.to||''}`;
  const queue=$('towerQueue'),items=data.intervention||[];if(queue)queue.innerHTML=items.length?items.map(item=>`<article class="tower-signal"><div><span class="tower-state ${classFor(item.state)}">${esc(labels[item.state]||'학습 중')}</span><strong>${esc(item.name)}</strong><small>최근 7일 익명 반응 ${Number(item.recentTotal||0).toLocaleString('ko-KR')}건</small></div><ul>${item.signals.map(signal=>`<li>${esc(signal)}</li>`).join('')}</ul></article>`).join(''):'<div class="tower-empty">현재 운영 개입이 필요한 뚜렷한 신호가 없습니다. 데이터가 더 쌓이면 자동으로 후보를 올립니다.</div>';
  const status=$('towerStatus');if(status)status.textContent=`최근 반응이 발생한 ${Number(s.activeStores||0).toLocaleString('ko-KR')}개 점포를 익명 집계로 살펴봤습니다. 순위가 아니라 운영 개입 후보만 표시합니다.`;
 }
 async function start(session){if(!session?.access_token)return;const status=$('towerStatus');try{const r=await fetch(route('/api/admin-store-health'),{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'}),data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`http_${r.status}`);render(data)}catch(e){if(status)status.textContent='상권 운영 신호를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'}}
 window.CGMA_CONTROL_TOWER={start};
})();
