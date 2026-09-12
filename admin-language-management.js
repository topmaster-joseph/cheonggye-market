(()=>{
  const API='https://api.ekodi.kr/api/i18n/v1/admin';
  const SERVICE='cgma';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  let token='';
  const status=(text,error=false)=>{const el=$('languageAdminStatus');if(!el)return;el.textContent=text||'';el.className=`admin-resource-status${error?' error':''}`};
  const stageLabel=value=>({source:'원문',queued:'대기',translating:'번역중',validating:'검증중','release-ready':'게시준비',published:'번역완료',stale:'원문변경',blocked:'보류'})[String(value||'')]||String(value||'확인 필요');
  async function request(path='',options={}){
    const join=path.includes('?')?'&':'?';
    const response=await fetch(`${API}${path}${join}service=${SERVICE}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})},cache:'no-store'});
    const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`language_${response.status}`);return data;
  }
  function render(data){
    const site=data.site||{},items=Array.isArray(site.languages)?site.languages:[],root=$('languageAdminList');if(!root)return;
    const published=items.filter(item=>item.public).length,ready=items.filter(item=>['source','published'].includes(item.status)).length;
    $('languagePublishedCount').textContent=String(published);$('languageReadyCount').textContent=String(ready);
    root.innerHTML=items.map(item=>{const source=item.locale==='ko-KR'||item.status==='source',ready=['source','published'].includes(item.status),next=item.public?'hidden':'published';return `<article class="admin-resource-item" data-locale="${esc(item.locale)}"><div><div class="admin-resource-meta"><span class="admin-chip">${esc(item.locale)}</span><span class="admin-chip">번역 ${esc(stageLabel(item.status))}</span><span class="admin-chip ${item.public?'':'off'}">${item.public?'게시':'비게시'}</span></div><h3>${esc(item.label||item.nativeName||item.locale)}</h3><p>번역 상태와 실제 게시 여부를 분리해 관리합니다.</p></div><div class="admin-resource-buttons"><button type="button" data-language-toggle data-next="${next}" ${source||!ready?'disabled':''}>${source?'기본 공개':item.public?'게시 중지':ready?'게시':'번역 준비 중'}</button></div></article>`}).join('');
    root.querySelectorAll('[data-language-toggle]').forEach(button=>button.onclick=()=>toggle(button));
    status(`중앙 원장과 동기화됨 · 게시 ${published}개 · 번역완료 ${ready}개`);
  }
  async function load(){status('다국어 상태를 확인하는 중입니다.');try{render(await request('/status'))}catch(error){console.error(error);status('다국어 상태를 불러오지 못했습니다.',true)}}
  async function toggle(button){const row=button.closest('[data-locale]');if(!row)return;button.disabled=true;status('게시 상태를 변경하고 있습니다.');try{await request('/publication',{method:'PUT',body:JSON.stringify({locale:row.dataset.locale,publicationStatus:button.dataset.next})});await load()}catch(error){console.error(error);status(error.message==='translation_not_ready'?'번역 검증이 끝난 언어만 게시할 수 있습니다.':'게시 상태를 변경하지 못했습니다.',true);button.disabled=false}}
  function start(session){token=session?.access_token||'';if(!token)return;const panel=$('languageManager');if(panel)panel.hidden=false;$('languageAdminRefresh')?.addEventListener('click',load);load()}
  window.CGMA_LANGUAGE_ADMIN={start,load};
})();
