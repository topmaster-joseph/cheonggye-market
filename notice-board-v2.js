(()=>{
  const list=document.querySelector('#associationNoticeList');
  const form=document.querySelector('#noticeForm');
  const editor=document.querySelector('#noticeEditor');
  const toggle=document.querySelector('#noticeWriteToggle');
  const status=document.querySelector('#noticeFormStatus');
  const adminNav=document.querySelector('#adminNav');
  if(!list||!form)return;

  let items=[],canManage=false,rendering=false;
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const date=value=>{const d=new Date(value);return Number.isNaN(d.valueOf())?'최근 등록':new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric'}).format(d)};
  const detailId=()=>{
    const prefix=window.CGMA_ROUTE?.prefix||'';
    const normalized=location.pathname.replace(/\/+$/,'');
    const relative=prefix&&normalized.startsWith(prefix)?normalized.slice(prefix.length):normalized;
    return Number(relative.match(/^\/notices\/(\d+)$/)?.[1]||0);
  };
  const permalink=id=>route('/notices/'+encodeURIComponent(Number(id)));

  async function session(){
    if(!window.supabase)return null;
    const client=window.__CGMA_NOTICE_AUTH||(window.__CGMA_NOTICE_AUTH=window.supabase.createClient(
      'https://renzehysxirjilvdxacv.supabase.co',
      'sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_'
    ));
    return (await client.auth.getSession()).data.session||null;
  }

  async function authority(){
    const current=await session();
    if(!current)return {session:null,allowed:false};
    try{
      const response=await fetch(route('/api/admin-session'),{
        headers:{Authorization:'Bearer '+current.access_token},
        cache:'no-store'
      });
      return {session:current,allowed:response.ok};
    }catch{return {session:current,allowed:false}}
  }

  function render(){
    rendering=true;
    const wanted=detailId();
    const rows=wanted?items.filter(item=>Number(item.id)===wanted):items;
    if(wanted&&!rows.length){
      list.innerHTML='<div class="notice-loading">해당 공지를 찾을 수 없습니다. <a href="'+route('/#news')+'">공지 목록으로 돌아가기</a></div>';
      rendering=false;return;
    }
    list.innerHTML=rows.length?rows.map(item=>`
      <article class="notice-card${item.pinned?' pinned':''}" data-notice-id="${Number(item.id)}">
        <div class="notice-meta"><span>${item.pinned?'중요 · ':''}${esc(item.category||'공지')}</span><time>${date(item.created_at)}</time></div>
        <h4><a href="${permalink(item.id)}">${esc(item.title)}</a></h4>
        <p>${esc(item.content).replace(/\n/g,'<br>')}</p>
        <div class="notice-footer"><span>${esc(item.author||'청계면상인회')}</span>
          ${canManage?'<span class="notice-row-actions"><button type="button" data-board-edit="'+Number(item.id)+'">수정</button><button class="notice-delete" type="button" data-board-delete="'+Number(item.id)+'">삭제</button></span>':''}
        </div>
        ${wanted?'<p><a class="text-link" href="'+route('/#news')+'">← 공지 목록</a></p>':''}
      </article>`).join(''):'<div class="notice-loading">등록된 공지사항이 없습니다.</div>';
    rendering=false;
  }

  async function load(){
    try{
      const response=await fetch(route('/api/notices?t='+Date.now()),{cache:'no-store'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'notice_load_failed');
      items=Array.isArray(data.items)?data.items:[];
      const auth=await authority();canManage=auth.allowed;
      if(toggle)toggle.hidden=!canManage;
      if(adminNav)adminNav.hidden=!canManage;
      render();
    }catch{
      list.innerHTML='<div class="notice-loading">공지사항을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</div>';
    }
  }

  function edit(item){
    if(!canManage||!item)return;
    form.elements.id.value=String(item.id);
    form.elements.category.value=item.category||'공지';
    form.elements.title.value=item.title||'';
    form.elements.content.value=item.content||'';
    form.elements.pinned.checked=Boolean(item.pinned);
    editor.hidden=false;
    if(toggle)toggle.textContent='작성 닫기';
    status.textContent='공지를 수정합니다.';
    editor.scrollIntoView({behavior:'smooth',block:'center'});
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const auth=await authority();
    if(!auth.allowed||!auth.session){status.textContent='관리 권한을 확인해 주세요.';return}
    const data=new FormData(form),id=Number(data.get('id')||0);
    const payload={
      category:data.get('category'),title:data.get('title'),content:data.get('content'),
      pinned:data.get('pinned')==='on'
    };
    if(id)payload.id=id;
    status.textContent=id?'공지를 수정하고 있습니다.':'공지를 등록하고 있습니다.';
    const response=await fetch(route('/api/notices'),{
      method:id?'PUT':'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.session.access_token},
      body:JSON.stringify(payload)
    });
    if(!response.ok){status.textContent='저장 권한과 입력 내용을 확인해 주세요.';return}
    form.reset();editor.hidden=true;if(toggle)toggle.textContent='공지 작성';
    status.textContent=id?'수정되었습니다.':'등록되었습니다.';
    await load();
  },true);

  list.addEventListener('click',async event=>{
    const editButton=event.target.closest('[data-board-edit]');
    if(editButton){event.preventDefault();event.stopImmediatePropagation();edit(items.find(item=>Number(item.id)===Number(editButton.dataset.boardEdit)));return}
    const deleteButton=event.target.closest('[data-board-delete]');
    if(!deleteButton)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(!confirm('이 공지를 삭제할까요?'))return;
    const auth=await authority();if(!auth.allowed||!auth.session)return;
    const response=await fetch(route('/api/notices?id='+encodeURIComponent(deleteButton.dataset.boardDelete)),{
      method:'DELETE',headers:{Authorization:'Bearer '+auth.session.access_token}
    });
    if(response.ok){
      if(detailId())history.replaceState(null,'',route('/#news'));
      await load();
    }
  },true);

  toggle?.addEventListener('click',()=>{
    if(!canManage)return;
    if(editor.hidden){
      form.reset();
      form.elements.id.value='';
      status.textContent='';
      editor.hidden=false;
      toggle.textContent='작성 닫기';
      form.elements.title?.focus();
      return;
    }
    editor.hidden=true;
    form.reset();
    form.elements.id.value='';
    status.textContent='';
    toggle.textContent='공지 작성';
  },true);

  const observer=new MutationObserver(()=>{
    if(rendering)return;
    if(!list.querySelector('[data-board-edit]')&&canManage)setTimeout(render,0);
  });
  observer.observe(list,{childList:true});

  window.CGMA_NOTICE_BOARD=Object.freeze({reload:load,permalink});
  setTimeout(load,0);
})();