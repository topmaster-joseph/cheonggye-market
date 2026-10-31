(()=>{
  'use strict';
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const root=document.getElementById('ipArchiveList');
  const status=document.getElementById('ipArchiveStatus');
  if(!root||!status)return;
  const setStatus=(message,error=false)=>{
    status.textContent=message;
    status.dataset.state=error?'error':'ready';
  };
  function appendText(parent,tag,value,className){
    const el=document.createElement(tag);
    if(className)el.className=className;
    el.textContent=String(value||'');
    parent.append(el);
    return el;
  }
  function render(items){
    root.replaceChildren();
    if(!items.length){appendText(root,'p','보관된 지식재산권 항목이 없습니다.');return}
    for(const item of items){
      // Links are only received after server-side tenant admin authorization.
      if(!/^https:\/\/drive\.google\.com\//.test(item.url))continue;
      const card=document.createElement('article');
      card.className='cgma-ip-card';
      const meta=document.createElement('div');
      meta.className='cgma-ip-meta';
      appendText(meta,'span',item.category);
      appendText(meta,'small',item.state);
      card.append(meta);
      appendText(card,'h3',item.title);
      appendText(card,'p',item.note);
      const link=document.createElement('a');
      link.href=item.url;
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.referrerPolicy='no-referrer';
      link.textContent='구글 드라이브에서 열기 ↗';
      card.append(link);
      root.append(card);
    }
  }
  let started=false;
  async function start(session){
    if(started)return;
    started=true;
    const token=session?.access_token;
    if(!token){setStatus('관리자 로그인 후 자료를 조회할 수 있습니다.',true);return}
    setStatus('비공개 자료 목록을 불러오는 중입니다.');
    try{
      const response=await fetch(route('/api/ip-archive'),{
        method:'GET',
        headers:{Authorization:'Bearer '+token},
        cache:'no-store',
        credentials:'omit'
      });
      if(!response.ok)throw Error('access_denied_'+response.status);
      const data=await response.json();
      if(data.ok!==true||data.scope!=='tenant:cheonggye'||!Array.isArray(data.documents))throw Error('invalid_archive_response');
      render(data.documents);
      setStatus(data.documents.length+'건의 보관 위치를 확인했습니다. 파일 접근은 구글 드라이브 권한에 따라 별도 제한됩니다.');
    }catch(error){
      console.warn('CGMA private IP archive unavailable',error?.message||'error');
      root.replaceChildren();
      setStatus('보안 검증 또는 자료 조회에 실패했습니다. 관리자 권한 및 자료실 연결을 확인해 주세요.',true);
    }
  }
  window.CGMA_IP_ARCHIVE={start};
})();
