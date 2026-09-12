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

  function loadScript(id,src){
    return new Promise((resolve,reject)=>{
      const current=$(id);
      if(current){if(current.dataset.loaded==='1')resolve();else{current.addEventListener('load',resolve,{once:true});current.addEventListener('error',reject,{once:true})}return}
      const script=document.createElement('script');script.id=id;script.src=src;script.async=false;
      script.addEventListener('load',()=>{script.dataset.loaded='1';resolve()},{once:true});script.addEventListener('error',reject,{once:true});document.head.appendChild(script);
    });
  }
  function installMapLibreCss(){
    if($('cgmaMapLibreCss'))return;
    const link=document.createElement('link');link.id='cgmaMapLibreCss';link.rel='stylesheet';link.href='https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';document.head.appendChild(link);
  }
  async function installCompliantBaseMap(attempt=0){
    if(typeof marketLeafletMap==='undefined'||!marketLeafletMap||!window.L){
      if(attempt<16)setTimeout(()=>installCompliantBaseMap(attempt+1),120);
      return;
    }
    if(marketLeafletMap.__cgmaOpenFreeMapInstalled)return;
    marketLeafletMap.eachLayer(layer=>{
      const url=String(layer?._url||'');
      if(layer instanceof window.L.TileLayer&&(url.includes('tile.openstreetmap.org')||url.includes('basemaps.cartocdn.com')))marketLeafletMap.removeLayer(layer);
    });
    try{
      installMapLibreCss();
      if(!window.maplibregl)await loadScript('cgmaMapLibreJs','https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.js');
      if(!window.L.maplibreGL)await loadScript('cgmaMapLibreLeafletJs','https://unpkg.com/@maplibre/maplibre-gl-leaflet/leaflet-maplibre-gl.js');
      window.L.maplibreGL({style:'https://tiles.openfreemap.org/styles/positron'}).addTo(marketLeafletMap);
      marketLeafletMap.attributionControl?.addAttribution('OpenFreeMap © OpenMapTiles · Data © OpenStreetMap contributors');
      marketLeafletMap.__cgmaOpenFreeMapInstalled=true;
    }catch(error){
      console.warn('CGMA OpenFreeMap basemap unavailable',error);
    }
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
    installCompliantBaseMap();
    installPublicCount();
    installAdminMetric();
    refreshPublicCount();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
