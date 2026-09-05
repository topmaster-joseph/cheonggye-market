(()=>{
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let token='',items=[];
  const status=(text,error=false)=>{const el=$('noticeAdminStatus');if(!el)return;el.textContent=text||'';el.className=`admin-resource-status${error?' error':''}`};
  const headers=()=>({'Content-Type':'application/json',Authorization:`Bearer ${token}`});
  function reset(){
    const form=$('noticeAdminForm');form.reset();form.elements.id.value='';form.elements.category.value='공지';
    form.hidden=false;$('noticeFormTitle').textContent='새 공지·행사 등록';form.elements.title.focus();
  }
  function edit(id){
    const item=items.find(row=>Number(row.id)===Number(id));if(!item)return;
    const form=$('noticeAdminForm');form.elements.id.value=item.id;form.elements.category.value=item.category||'공지';
    form.elements.title.value=item.title||'';form.elements.content.value=item.content||'';form.elements.pinned.checked=Number(item.pinned)===1;
    form.hidden=false;$('noticeFormTitle').textContent='공지·행사 수정';form.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function render(){
    const list=$('noticeAdminList');if(!list)return;
    if(!items.length){list.innerHTML='<div class="admin-empty">등록된 공지·행사가 없습니다.</div>';return}
    list.innerHTML=items.map(item=>`<article class="admin-notice-item"><div><div class="admin-notice-meta"><span class="admin-chip">${esc(item.category||'공지')}</span>${Number(item.pinned)===1?'<span class="admin-chip">상단고정</span>':''}</div><h3>${esc(item.title)}</h3><p>${esc(item.content)}</p></div><div class="admin-notice-actions"><button type="button" data-edit="${item.id}">수정</button><button type="button" class="remove" data-remove="${item.id}">삭제</button></div></article>`).join('');
    list.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>edit(button.dataset.edit));
    list.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>deleteNotice(button.dataset.remove));
  }
  async function load(){
    status('공지·행사를 불러오는 중입니다.');
    try{
      const response=await fetch(route('/api/notices'),{cache:'no-store'}),data=await response.json();
      if(!response.ok)throw new Error(data.error||'notice_load_failed');
      items=data.items||[];render();if($('noticeCount'))$('noticeCount').textContent=String(items.length);
      status(`${items.length}개 공지·행사를 관리할 수 있습니다.`);
    }catch(error){console.error(error);status('공지·행사를 불러오지 못했습니다.',true)}
  }
  async function save(event){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form),id=Number(data.get('id')||0);
    const payload={id,title:data.get('title'),content:data.get('content'),category:data.get('category'),pinned:data.get('pinned')==='on'};
    status(id?'공지·행사를 수정하고 있습니다.':'공지·행사를 등록하고 있습니다.');
    try{
      const response=await fetch(route('/api/notices'),{method:id?'PUT':'POST',headers:headers(),body:JSON.stringify(payload)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'notice_save_failed');
      form.hidden=true;await load();status(id?'수정했습니다.':'등록했습니다.');
    }catch(error){console.error(error);status('저장하지 못했습니다.',true)}
  }
  async function deleteNotice(id){
    const item=items.find(row=>Number(row.id)===Number(id));if(!item||!confirm(`“${item.title}” 항목을 삭제할까요?`))return;
    status('삭제하고 있습니다.');
    try{
      const response=await fetch(route(`/api/notices?id=${encodeURIComponent(id)}`),{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'notice_delete_failed');
      items=items.filter(row=>Number(row.id)!==Number(id));render();if($('noticeCount'))$('noticeCount').textContent=String(items.length);status('삭제했습니다.');
    }catch(error){console.error(error);status('삭제하지 못했습니다.',true)}
  }
  function start(session){
    token=session?.access_token||'';if(!token)return;
    const panel=$('noticeManager');if(panel)panel.hidden=false;
    $('addNoticeBtn')?.addEventListener('click',reset);
    $('noticeCancel')?.addEventListener('click',()=>{$('noticeAdminForm').hidden=true});
    $('noticeAdminForm')?.addEventListener('submit',save);
    load();
  }
  window.CGMA_NOTICE_ADMIN={start,load};
})();
