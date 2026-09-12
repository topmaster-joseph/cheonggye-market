(()=>{
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const $=id=>document.getElementById(id);

  function installStyles(){
    if($('merchantDirectoryWebStyles'))return;
    const style=document.createElement('style');
    style.id='merchantDirectoryWebStyles';
    style.textContent=`
      .hero-stats.has-associate-member-stat{grid-template-columns:repeat(4,minmax(0,1fr));}
      .market-pin.regular{background:#075c43!important;box-shadow:0 0 0 4px rgba(216,255,62,.52),0 5px 16px rgba(7,66,50,.48)!important;transform:scale(1.14);z-index:2;}
      .market-pin.regular.active{transform:scale(1.28);box-shadow:0 0 0 5px rgba(216,255,62,.64),0 7px 20px rgba(7,66,50,.56)!important;}
      .market-pin.associate{background:#ad895b!important;opacity:.84;box-shadow:0 2px 8px rgba(70,52,31,.24)!important;}
      .map-legend-dot.regular{background:#075c43!important;box-shadow:0 0 0 3px rgba(216,255,62,.48);}
      .map-legend-dot.associate{background:#ad895b!important;}
      .directory-item.regular .directory-number{background:#075c43!important;box-shadow:0 0 0 3px rgba(216,255,62,.36);}
      .directory-item.associate .directory-number{background:#ad895b!important;opacity:.9;}
      .directory-item.regular b{color:#075c43;font-weight:900;}
      @media(max-width:760px){.hero-stats.has-associate-member-stat{grid-template-columns:repeat(2,minmax(0,1fr));}}
    `;
    document.head.appendChild(style);
  }

  function installPublicCount(){
    const stats=document.querySelector('.hero-stats');
    if(!stats||$('heroAssociate'))return;
    const regular=$('heroRegular')?.parentElement;
    const card=document.createElement('div');
    card.innerHTML='<strong id="heroAssociate">-</strong><span>준회원 점포</span>';
    if(regular?.parentElement===stats)regular.insertAdjacentElement('afterend',card);else stats.appendChild(card);
    stats.classList.add('has-associate-member-stat');
  }

  function installAdminMetric(){
    const regular=$('regularMerchantCount')?.closest('.admin-metric');
    const metrics=regular?.parentElement;
    if(!regular||!metrics||$('associateMerchantCount'))return;
    const card=document.createElement('article');
    card.className='admin-metric';
    card.innerHTML='<span>준회원 점포</span><b id="associateMerchantCount">…</b><p>준회원으로 공개된 점포</p>';
    regular.insertAdjacentElement('afterend',card);
  }

  async function refreshPublicCount(){
    if(!$('heroAssociate'))return;
    try{
      const response=await fetch(route('/api/merchants'),{cache:'no-store'});
      if(!response.ok)throw new Error('merchant_count_failed');
      const data=await response.json();
      const associate=(data.items||[]).filter(item=>item.membership==='associate').length;
      $('heroAssociate').textContent=`${associate}곳`;
    }catch(error){
      console.warn('CGMA associate-member count unavailable',error);
      $('heroAssociate').textContent='-';
    }
  }

  function init(){
    installStyles();
    installPublicCount();
    installAdminMetric();
    refreshPublicCount();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
