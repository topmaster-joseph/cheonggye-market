(()=>{
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let token='';
  async function load(){
    const status=$('petitionAdminStatus'),root=$('petitionAdminList');if(!root)return;
    status.textContent='동의 접수 내역을 불러오는 중입니다.';
    try{
      const response=await fetch(route('/api/parking-petition?include_entries=1'),{headers:{Authorization:`Bearer ${token}`}});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'load_failed');
      $('petitionCount').textContent=String(data.count||0);
      root.innerHTML=(data.items||[]).length?(data.items||[]).map(item=>`<article class="admin-resource-item"><div><div class="admin-resource-meta"><span class="admin-chip">${esc(item.signer_division)}</span><span class="admin-chip">${esc(item.residential_area)}</span></div><h3>${esc(item.signer_name)}</h3><p>${esc(item.created_at)}</p></div></article>`).join(''):'<div class="admin-empty">홈페이지에서 새로 접수된 동의가 없습니다.</div>';
      status.textContent=`홈페이지 접수 ${data.count||0}건을 확인할 수 있습니다.`;
    }catch(error){console.error(error);status.textContent='동의 접수 내역을 불러오지 못했습니다.'}
  }
  function start(session){token=session?.access_token||'';if(!token)return;$('petitionManager').hidden=false;$('petitionRefresh')?.addEventListener('click',load);load()}
  window.CGMA_PETITION_ADMIN={start};
})();
