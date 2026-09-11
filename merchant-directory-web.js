(()=>{
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const $=id=>document.getElementById(id);

  function installStyles(){
    if($('merchantDirectoryWebStyles'))return;
    const style=document.createElement('style');
    style.id='merchantDirectoryWebStyles';
    style.textContent=`
      .hero-stats.has-associate-member-stat{grid-template-columns:repeat(4,minmax(0,1fr));}
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
