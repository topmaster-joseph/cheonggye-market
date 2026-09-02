(()=>{
  const root=document.getElementById('resourceGroups');
  const featured=document.getElementById('resourceFeatured');
  if(!root||!featured)return;
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const labels={essential:['바로가기','ESSENTIAL'],festival:['골목축제','FESTIVAL'],support:['상권 관련 지원사업','SUPPORT'],revitalization:['상권활성화 지원사업','REVITALIZATION'],urban:['도시재생 특화사업','URBAN'],communication:['소통채널','COMMUNICATION']};
  const sectionOrder=['essential','festival','support','revitalization','urban','communication'];
  const href=item=>item.id==='member-registration'?route('/member'):route(`/resource?id=${encodeURIComponent(item.id)}`);
  const arrow=item=>item.kind==='video'?'▶':'→';
  const card=item=>`<a class="resource-link" href="${esc(href(item))}"><span><b>${esc(item.title)}</b>${item.note?`<small>${esc(item.note)}</small>`:''}</span><span class="resource-arrow" aria-hidden="true">${arrow(item)}</span></a>`;
  async function load(){
    try{
      const endpoint=route('/api/resources');
      const response=await fetch(`${endpoint}?t=${Date.now()}`);
      if(!response.ok)throw new Error('resource');
      const data=await response.json(),items=data.items||[];
      const picks=items.filter(x=>Number(x.featured)===1).slice(0,4);
      featured.innerHTML=picks.map(item=>`<a href="${esc(href(item))}"><span>${esc(item.title)}</span><span>${arrow(item)}</span></a>`).join('');
      featured.hidden=!picks.length;
      root.innerHTML=sectionOrder.map(section=>{const list=items.filter(item=>item.section===section);if(!list.length)return '';const [ko,en]=labels[section]||[section,'RESOURCE'];return `<article class="resource-group"><h3><span>${esc(ko)}</span><small>${esc(en)}</small></h3><div class="resource-list">${list.map(card).join('')}</div></article>`}).join('')||'<div class="resource-loading">공개된 자료가 아직 없습니다.</div>';
    }catch(error){console.error(error);root.innerHTML='<div class="resource-loading">자료실 연결을 준비하고 있습니다. 잠시 후 다시 확인해 주세요.</div>';featured.hidden=true}
  }
  load();
})();
