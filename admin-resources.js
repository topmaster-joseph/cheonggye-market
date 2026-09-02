(()=>{
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const sectionLabels={essential:'바로가기',festival:'골목축제',support:'상권 관련 지원사업',revitalization:'상권활성화 지원사업',urban:'도시재생 특화사업',communication:'소통채널'};
  let token='',items=[];
  const status=(text,error=false)=>{const el=$('resourceAdminStatus');if(!el)return;el.textContent=text||'';el.className=`admin-resource-status${error?' error':''}`};
  const headers=()=>({'Content-Type':'application/json',Authorization:`Bearer ${token}`});
  async function load(){
    status('자료실 항목을 불러오는 중입니다.');
    try{
      const response=await fetch(route('/api/resources?include_hidden=1'),{headers:{Authorization:`Bearer ${token}`}});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'load_failed');items=data.items||[];render();const count=$("resourceCount");if(count)count.textContent=String(items.length);status(`${items.length}개 항목을 관리할 수 있습니다.`);
    }catch(error){console.error(error);status('자료실을 불러오지 못했습니다.',true)}
  }
  function render(){
    const root=$('resourceAdminList');if(!root)return;
    root.innerHTML=items.length?items.map(item=>`<article class="admin-resource-item" data-id="${esc(item.id)}"><div><div class="admin-resource-meta"><span class="admin-chip">${esc(sectionLabels[item.section]||item.section)}</span><span class="admin-chip">${item.kind==='video'?'영상':'링크'}</span>${Number(item.featured)?'<span class="admin-chip">추천</span>':''}${Number(item.visible)?'':'<span class="admin-chip off">숨김</span>'}</div><h3>${esc(item.title)}</h3><p>${esc(item.url)}</p></div><div class="admin-resource-buttons"><button type="button" data-edit>수정</button><button class="danger" type="button" data-delete>삭제</button></div></article>`).join(''):'<div class="admin-empty">등록된 자료가 없습니다.</div>';
    root.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>edit(button.closest('[data-id]').dataset.id));
    root.querySelectorAll('[data-delete]').forEach(button=>button.onclick=()=>remove(button.closest('[data-id]').dataset.id));
  }
  function reset(){const form=$('resourceAdminForm');form.reset();form.elements.id.value='';form.elements.visible.checked=true;form.hidden=false;form.elements.title.focus();$('resourceFormTitle').textContent='새 자료 등록'}
  function edit(id){const item=items.find(x=>x.id===id);if(!item)return;const form=$('resourceAdminForm');for(const key of ['id','section','kind','title','url','note','sort_order'])if(form.elements[key])form.elements[key].value=item[key]??'';form.elements.visible.checked=Number(item.visible)===1;form.elements.featured.checked=Number(item.featured)===1;form.hidden=false;$('resourceFormTitle').textContent='자료 수정';form.scrollIntoView({behavior:'smooth',block:'center'})}
  async function remove(id){const item=items.find(x=>x.id===id);if(!item||!confirm(`“${item.title}” 항목을 삭제할까요?`))return;status('삭제 중입니다.');try{const response=await fetch(route(`/api/resources?id=${encodeURIComponent(id)}`),{method:'DELETE',headers:{Authorization:`Bearer ${token}`}});const data=await response.json();if(!response.ok)throw new Error(data.error||'delete_failed');await load()}catch(error){console.error(error);status('삭제하지 못했습니다.',true)}}
  async function save(event){event.preventDefault();const form=event.currentTarget,data=new FormData(form),id=String(data.get('id')||'').trim();const payload={id,section:data.get('section'),kind:data.get('kind'),title:data.get('title'),url:data.get('url'),note:data.get('note'),sort_order:Number(data.get('sort_order')||100),visible:data.get('visible')==='on',featured:data.get('featured')==='on'};status(id?'수정사항을 저장하고 있습니다.':'새 자료를 등록하고 있습니다.');try{const response=await fetch(route('/api/resources'),{method:id?'PUT':'POST',headers:headers(),body:JSON.stringify(payload)});const result=await response.json();if(!response.ok)throw new Error(result.error||'save_failed');form.hidden=true;await load()}catch(error){console.error(error);status(error.message==='title_url_required'||error.message==='id_title_url_required'?'제목과 올바른 URL을 확인해 주세요.':'저장하지 못했습니다.',true)}}
  function start(session){token=session?.access_token||'';if(!token)return;const panel=$('resourceManager');if(panel)panel.hidden=false;$('addResourceBtn')?.addEventListener('click',reset);$('resourceCancel')?.addEventListener('click',()=>{$('resourceAdminForm').hidden=true});$('resourceAdminForm')?.addEventListener('submit',save);load()}
  window.CGMA_RESOURCE_ADMIN={start};
})();