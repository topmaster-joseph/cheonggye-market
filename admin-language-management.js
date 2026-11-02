(()=>{
  'use strict';
  const API='https://ekodi.kr/api/i18n/v1/admin';
  const SERVICE='cgma';
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const stageLabel=value=>({source:'원문',queued:'대기',translating:'번역 중',validating:'검증 중','release-ready':'게시 준비',published:'번역 완료',stale:'원문 변경',blocked:'보류'})[String(value||'')]||'확인 필요';
  let token='',loading=false;
  const status=(message,error=false)=>{
    const el=$('languageAdminStatus');
    if(!el)return;
    el.textContent=message;
    el.className='admin-resource-status'+(error?' error':'');
  };
  function unavailable(message){
    $('languagePublishedCount').textContent='—';
    $('languageReadyCount').textContent='—';
    const list=$('languageAdminList');
    if(list){
      list.replaceChildren();
      const p=document.createElement('p');
      p.className='admin-empty';
      p.textContent='다국어 게시 현황을 확인할 수 없습니다. 데이터를 0개로 간주하지 않습니다.';
      list.appendChild(p);
    }
    status(message,true);
  }
  async function request(path='',options={}){
    if(!token)throw new Error('login_required');
    const join=path.includes('?')?'&':'?';
    const response=await fetch(`${API}${path}${join}service=${SERVICE}`,{
      ...options,
      headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})},
      cache:'no-store'
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(response.status===401?'login_required':response.status===403?'forbidden':data.error||`language_${response.status}`);
    return data;
  }
  function render(data){
    const items=data?.site?.languages;
    if(!Array.isArray(items))throw new Error('invalid_language_status');
    const root=$('languageAdminList');
    if(!root)return;
    const published=items.filter(item=>item.public===true).length;
    const ready=items.filter(item=>['source','published'].includes(item.status)).length;
    $('languagePublishedCount').textContent=`${published}개`;
    $('languageReadyCount').textContent=`${ready}개`;
    root.innerHTML=items.length?items.map(item=>{
      const source=item.locale==='ko-KR'||item.status==='source';
      const ready=['source','published'].includes(item.status);
      const next=item.public?'hidden':'published';
      return `<article class="admin-resource-item" data-locale="${esc(item.locale)}"><div><div class="admin-resource-meta"><span class="admin-chip">${esc(item.locale)}</span><span class="admin-chip">번역 ${esc(stageLabel(item.status))}</span><span class="admin-chip ${item.public?'':'off'}">${item.public?'게시':'비게시'}</span></div><h3>${esc(item.label||item.nativeName||item.locale)}</h3><p>번역 완료 여부와 실제 게시 여부를 별도로 관리합니다.</p></div><div class="admin-resource-buttons"><button type="button" data-language-toggle data-next="${next}" ${source||!ready?'disabled':''}>${source?'기본 공개':item.public?'게시 중지':ready?'게시':'번역 준비 중'}</button></div></article>`;
    }).join(''):'<p class="admin-empty">추가로 관리할 번역 언어가 없습니다. 한국어 원문은 항상 공개됩니다.</p>';
    root.querySelectorAll('[data-language-toggle]').forEach(button=>button.addEventListener('click',()=>toggle(button)));
    status(`중앙 원장 확인 완료 · 게시 ${published}개 · 번역 완료 ${ready}개`);
  }
  async function load(){
    if(loading)return;
    loading=true;
    const refresh=$('languageAdminRefresh');
    if(refresh)refresh.disabled=true;
    status('중앙 다국어 원장에서 현재 현황을 확인 중입니다.');
    try{
      render(await request('/status'));
    }catch(error){
      console.error('CGMA language status',error);
      const msg=error.message==='login_required'?'인증이 만료되었습니다. 다시 로그인한 후 조회해 주세요.':
        error.message==='forbidden'?'다국어 관리 권한이 없어 현황을 볼 수 없습니다.':
        '중앙 다국어 원장 연결에 실패했습니다. 새로고침을 눌러 다시 조회하세요.';
      unavailable(msg);
    }finally{
      loading=false;
      if(refresh)refresh.disabled=false;
    }
  }
  async function toggle(button){
    const row=button.closest('[data-locale]');
    if(!row||loading)return;
    button.disabled=true;
    status('게시 상태를 변경하고 있습니다.');
    try{
      await request('/publication',{method:'PUT',body:JSON.stringify({locale:row.dataset.locale,publicationStatus:button.dataset.next})});
      await load();
    }catch(error){
      console.error('CGMA language publication',error);
      unavailable(error.message==='translation_not_ready'?'번역 검증이 끝난 언어만 게시할 수 있습니다. 다시 조회해 주세요.':'게시 상태 확인에 실패했습니다. 새로고침으로 실제 게시 상태를 확인해 주세요.');
    }
  }
  function start(session){
    token=session?.access_token||'';
    $('languageManager').hidden=false;
    $('languageAdminRefresh')?.addEventListener('click',load);
    if(token)load();
    else unavailable('로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
  }
  window.CGMA_LANGUAGE_ADMIN={start,load};
})();