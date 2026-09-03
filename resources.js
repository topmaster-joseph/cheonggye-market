(()=>{
  const root=document.getElementById('resourceGroups'),featured=document.getElementById('resourceFeatured');
  const search=document.getElementById('resourceSearch'),result=document.getElementById('resourceResult');
  if(!root||!featured)return;
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const tags={member:'회원·운영',support:'지원사업',urban:'도시재생',media:'축제·공청회',communication:'소통채널'},order={member:0,support:1,urban:2,media:3,communication:4};
  let items=[],filter='all';
  const kindOf=item=>{
    if(item.id==='hearing-2025'||item.section==='festival'||item.kind==='video')return 'media';
    if(item.section==='urban')return 'urban';
    if(item.section==='communication')return 'communication';
    if(item.section==='support'||item.section==='revitalization')return 'support';
    return 'member';
  };
  const href=item=>item.id==='member-registration'?route('/member'):route(`/resource?id=${encodeURIComponent(item.id)}`);
  const action=item=>item.id==='parking-petition'?'바로 참여하기':item.kind==='video'?'영상 보기':'바로 보기';
  const card=item=>{
    const type=kindOf(item),video=item.kind==='video'?' video':'';
    return `<a class="resource-card${video}" href="${esc(href(item))}"><span class="resource-type">${esc(tags[type])}</span><h3>${esc(item.title)}</h3>${item.note?`<p>${esc(item.note)}</p>`:''}<span class="resource-action">${esc(action(item))} →</span></a>`;
  };
  function render(){
    const q=(search?.value||'').trim().toLowerCase();
    const visible=items.filter(item=>(filter==='all'||kindOf(item)===filter)&&(!q||`${item.title} ${item.note||''} ${tags[kindOf(item)]}`.toLowerCase().includes(q)));
    const hero=filter==='all'&&!q?(visible.find(item=>item.id==='parking-petition')||visible.find(item=>Number(item.featured)===1)):null;
    featured.hidden=!hero;
    featured.innerHTML=hero?`<a href="${esc(href(hero))}"><span>${esc(hero.title)}</span><span aria-hidden="true">→</span></a>`:'';
    const cards=hero?visible.filter(item=>item.id!==hero.id):visible;
    root.innerHTML=cards.length?cards.map(card).join(''):'<div class="resource-loading">조건에 맞는 자료가 없습니다.</div>';
    if(result)result.textContent=`${visible.length}개 자료`;
  }
  document.querySelectorAll('[data-resource-filter]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-resource-filter]').forEach(item=>item.classList.remove('active'));
    button.classList.add('active');filter=button.dataset.resourceFilter||'all';render();
  }));
  search?.addEventListener('input',render);
  (async()=>{
    try{
      const response=await fetch(`${route('/api/resources')}?t=${Date.now()}`,{cache:'no-store'});
      if(!response.ok)throw new Error(`resources ${response.status}`);
      const data=await response.json();items=(Array.isArray(data.items)?data.items:[]).sort((a,b)=>(order[kindOf(a)]-order[kindOf(b)])+(Number(a.sort_order||0)-Number(b.sort_order||0))/10000);render();
    }catch(error){
      console.error(error);root.innerHTML='<div class="resource-loading">자료실 연결을 준비하고 있습니다. 잠시 후 다시 확인해 주세요.</div>';featured.hidden=true;if(result)result.textContent='';
    }
  })();
})();
