(()=>{
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const categoryLabel={food:'음식·외식',cafe:'카페·디저트',life:'생활·편의',culture:'문화·서비스'};
  const memberLabel={regular:'정회원',associate:'준회원'};
  let token='',items=[];
  const status=(text,error=false)=>{const el=$('merchantAdminStatus');if(!el)return;el.textContent=text||'';el.className=`admin-resource-status${error?' error':''}`};
  const headers=()=>({'Content-Type':'application/json',Authorization:`Bearer ${token}`});
  function reset(){
    const form=$('merchantAdminForm');form.reset();form.elements.id.value='';form.elements.membership.value='regular';form.elements.category.value='food';form.elements.visible.checked=true;
    form.hidden=false;$('merchantFormTitle').textContent='새 점포 등록';form.elements.name.focus();
  }
  function edit(id){
    const item=items.find(row=>row.id===id);if(!item)return;const form=$('merchantAdminForm');
    for(const key of ['id','name','category','industry','address','phone','membership','sort_order'])if(form.elements[key])form.elements[key].value=item[key]??'';
    form.elements.visible.checked=Number(item.visible)!==0;form.hidden=false;$('merchantFormTitle').textContent='점포 정보 수정';form.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function render(){
    const root=$('merchantAdminList');if(!root)return;
    const q=String($('merchantSearch')?.value||'').trim().toLowerCase();
    const list=items.filter(item=>!q||`${item.name} ${item.industry||''} ${item.address||''}`.toLowerCase().includes(q));
    if(!list.length){root.innerHTML='<div class="admin-empty">조건에 맞는 점포가 없습니다.</div>';return}
    root.innerHTML=list.map(item=>`<article class="admin-resource-item"><div><div class="admin-resource-meta"><span class="admin-chip">${esc(memberLabel[item.membership]||item.membership)}</span><span class="admin-chip">${esc(categoryLabel[item.category]||item.category)}</span>${Number(item.visible)===0?'<span class="admin-chip off">비공개</span>':''}</div><h3>${esc(item.name)}</h3><p>${esc(item.industry||'업종 미입력')} · ${esc(item.address||'주소 미입력')}${item.phone?` · ${esc(item.phone)}`:''}</p></div><div class="admin-resource-buttons"><button type="button" data-edit="${esc(item.id)}">수정</button><button type="button" class="danger" data-remove="${esc(item.id)}">삭제</button></div></article>`).join('');
    root.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>edit(button.dataset.edit));
    root.querySelectorAll('[data-remove]').forEach(button=>button.onclick=()=>remove(button.dataset.remove));
  }
  async function load(){
    status('점포·회원 명부를 불러오는 중입니다.');
    try{
      const response=await fetch(route('/api/merchants?include_hidden=1'),{headers:{Authorization:`Bearer ${token}`},cache:'no-store'}),data=await response.json();
      if(!response.ok)throw new Error(data.error||'merchant_load_failed');items=data.items||[];render();
      if($('merchantCount'))$('merchantCount').textContent=String(items.filter(item=>Number(item.visible)!==0).length);
      const regular=items.filter(item=>item.membership==='regular'&&Number(item.visible)!==0).length;
      if($('regularMerchantCount'))$('regularMerchantCount').textContent=String(regular);
      status(data.degraded?'기본 점포명단을 표시 중입니다. 저장소 연결 상태를 확인해 주세요.':`${items.length}개 점포를 관리할 수 있습니다.`,Boolean(data.degraded));
    }catch(error){console.error(error);status('점포·회원 명부를 불러오지 못했습니다.',true)}
  }
  async function save(event){
    event.preventDefault();const form=event.currentTarget,data=new FormData(form),id=String(data.get('id')||'').trim();
    const payload={id,name:data.get('name'),category:data.get('category'),industry:data.get('industry'),address:data.get('address'),phone:data.get('phone'),membership:data.get('membership'),sort_order:Number(data.get('sort_order')||100),visible:data.get('visible')==='on'};
    status(id?'점포 정보를 수정하고 있습니다.':'새 점포를 등록하고 있습니다.');
    try{
      const response=await fetch(route('/api/merchants'),{method:id?'PUT':'POST',headers:headers(),body:JSON.stringify(payload)}),result=await response.json();
      if(!response.ok)throw new Error(result.error||'merchant_save_failed');
      form.hidden=true;await load();status(id?'점포 정보를 수정했습니다.':'새 점포를 등록했습니다.');
    }catch(error){console.error(error);status('점포 정보를 저장하지 못했습니다.',true)}
  }
  async function remove(id){
    const item=items.find(row=>row.id===id);if(!item||!confirm(`“${item.name}” 점포를 명부에서 삭제할까요?`))return;
    status('점포를 삭제하고 있습니다.');
    try{
      const response=await fetch(route(`/api/merchants?id=${encodeURIComponent(id)}`),{method:'DELETE',headers:{Authorization:`Bearer ${token}`}}),result=await response.json();
      if(!response.ok)throw new Error(result.error||'merchant_delete_failed');if(result.hidden){item.visible=0}else{items=items.filter(row=>row.id!==id)}render();
      if($('merchantCount'))$('merchantCount').textContent=String(items.filter(row=>Number(row.visible)!==0).length);status(result.hidden?'기본 점포를 공개지도에서 숨겼습니다.':'점포를 삭제했습니다.');
    }catch(error){console.error(error);status('점포를 삭제하지 못했습니다.',true)}
  }
  function start(session){
    token=session?.access_token||'';if(!token)return;
    const panel=$('merchantManager');if(panel)panel.hidden=false;
    $('addMerchantBtn')?.addEventListener('click',reset);
    $('merchantCancel')?.addEventListener('click',()=>{$('merchantAdminForm').hidden=true});
    $('merchantSearch')?.addEventListener('input',render);
    $('merchantAdminForm')?.addEventListener('submit',save);
    load();
  }
  window.CGMA_MERCHANT_ADMIN={start,load};
})();
