(()=>{
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const $=id=>document.getElementById(id);

  function installStyles(){
    if($('merchantDirectoryWebStyles'))return;
    const style=document.createElement('style');
    style.id='merchantDirectoryWebStyles';
    style.textContent=`
      .hero-stats.has-existing-member-stat{grid-template-columns:repeat(4,minmax(0,1fr));}
      .member-origin-help{font-size:.78rem;color:var(--muted,#66736d);margin-top:4px;display:block;}
      @media(max-width:760px){.hero-stats.has-existing-member-stat{grid-template-columns:repeat(2,minmax(0,1fr));}}
    `;
    document.head.appendChild(style);
  }

  function installPublicCount(){
    const stats=document.querySelector('.hero-stats');
    if(!stats||$('heroExisting'))return;
    const regular=$('heroRegular')?.parentElement;
    const card=document.createElement('div');
    card.innerHTML='<strong id="heroExisting">-</strong><span>기존회원 점포</span>';
    if(regular?.parentElement===stats)regular.insertAdjacentElement('afterend',card);else stats.appendChild(card);
    stats.classList.add('has-existing-member-stat');
  }

  function installAdminMetric(){
    const regular=$('regularMerchantCount')?.closest('.admin-metric');
    const metrics=regular?.parentElement;
    if(!regular||!metrics||$('existingMerchantCount'))return;
    const card=document.createElement('article');
    card.className='admin-metric';
    card.innerHTML='<span>기존회원 점포</span><b id="existingMerchantCount">…</b><p>기존 회원으로 입력된 공개 점포</p>';
    regular.insertAdjacentElement('afterend',card);
  }

  function installOriginField(){
    const form=$('merchantAdminForm');
    if(!form||form.elements.member_origin)return;
    const membership=form.elements.membership?.closest('label');
    const label=document.createElement('label');
    label.innerHTML='회원 이력<select name="member_origin"><option value="existing">기존회원</option><option value="new">신규회원</option><option value="none">비회원</option><option value="unknown">미분류</option></select><small class="member-origin-help">기존 엑셀 명부의 정회원은 기존회원으로 자동 이관됩니다.</small>';
    if(membership)membership.insertAdjacentElement('afterend',label);else form.appendChild(label);
  }

  async function refreshPublicCount(){
    if(!$('heroExisting'))return;
    try{
      const response=await fetch(route('/api/merchants'),{cache:'no-store'});
      if(!response.ok)throw new Error('merchant_count_failed');
      const data=await response.json();
      const existing=(data.items||[]).filter(item=>item.member_origin==='existing').length;
      $('heroExisting').textContent=`${existing}곳`;
    }catch(error){
      console.warn('CGMA existing-member count unavailable',error);
      $('heroExisting').textContent='-';
    }
  }

  function init(){
    installStyles();
    installPublicCount();
    installAdminMetric();
    installOriginField();
    refreshPublicCount();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
