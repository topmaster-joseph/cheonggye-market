const fallbackShops=[
['일오삼','food','음식점','청계면 상권','regular'],['자담치킨&피자마루','food','치킨·피자','승달산길 37-1','regular'],['카페IN','cafe','카페','도림길 75','regular'],['하늘애한의원','life','의료','청계면 상권','regular'],['1st헤어샵','culture','미용','청계면 상권','regular'],['메가커피 목포대점','cafe','카페','승달산길 39','regular'],['세븐일레븐 무안목포대점','life','편의점','승달산길 45','regular'],['미스터빈','cafe','카페','청계면 상권','regular'],['참새방앗간','food','음식점','도림리 311-19','regular'],['세븐일레븐 무안도림점','life','편의점','승달산길 36','regular'],['대림식당','food','한식','승달산길 13-1','regular'],['토스트굽는사람들','food','분식','승달산길 36','regular'],['빽다방 목포대점','cafe','카페','도림길 87-23','regular'],['컴포즈커피 목포대점','cafe','카페','승달산길 24','regular'],['평화자기','life','생활용품','청계면 상권','regular'],['무안하다','culture','문화·서비스','청계면 상권','regular'],['우후죽순','food','음식점','승달산길 34','regular'],['산들카페','cafe','카페','도림길 70-1','regular'],['청계화원','life','꽃·식물','도림길 19','regular'],['고깃집','food','한식','승달산길 21-1','regular'],['커피에빠지다','cafe','카페','승달산길 33','regular'],['삼일종합광고','culture','광고·인쇄','도림길 15-2','regular'],['대패세끼','food','한식','승달산길 29','regular'],['롯데리아 목포대점','food','패스트푸드','승달산길 17','regular'],['만남게임랜드','culture','게임·오락','청계면 상권','regular'],['이디야 목포대점','cafe','카페','도림길 92-2','regular'],['아트랜드','life','문구','승달산길 15','regular'],['나주곰탕','food','한식','청계면 상권','regular'],['바른탐정행정사','culture','행정서비스','청계면 상권','regular'],['이모네칼국수','food','분식','승달산길 41','regular'],['다마당구장','culture','생활체육','승달산길 18','regular'],['무안남부신협','life','금융','청계면 상권','regular'],['모모홀딩스','culture','서비스','청계면 상권','regular'],['공차 목포대점','cafe','카페','승달산길 24','regular'],['국제협력처','culture','기관','국립목포대학교','regular'],['안흥찐빵','food','분식','영산로 1686','regular'],['GS25','life','편의점','청계면 상권','regular'],['한국그린케어','life','생활서비스','청계면 상권','regular'],['동경야시장 목포대점','food','주점','승달산길 33','regular'],['행복한커피','cafe','카페','승달산길 35','regular'],['다담코리아','culture','서비스','청계면 상권','regular'],['만복환경자원','life','환경서비스','청계면 상권','regular'],['김정호스튜디오','culture','사진','승달산길 3','regular'],['승달마트','life','마트','도림길 70-2','regular'],['완미국밥','food','국밥','도림길 87-29','regular'],['책마당','life','서점','복길로 131','regular'],['술도가','food','주점','승달산길 17-6','regular'],['노래방','culture','노래방','청계면 상권','regular'],['한식뷔페','food','한식','청계면 상권','regular'],['목대신한은행','life','금융','국립목포대학교','regular'],
['BBQ치킨','food','치킨','승달산길 51','associate'],['파리바게뜨','food','베이커리','도림리 480-2','associate'],['역전할머니맥주','food','주점','승달산길 22-2','associate'],['삼겹본능공수간','food','한식','도림길 55','associate'],['도쿄라멘3900','food','일식','승달산길 31','associate'],['다이소 목포대점','life','생활용품','도림길 64','associate'],['순이네밥상','food','한식','승달산길 25','associate'],['한솥도시락','food','도시락','도림길 87-23','associate'],['명랑핫도그','food','분식','승달산길 33-1','associate'],['인생1횟집','food','횟집','도림길 55','associate'],['스타일바이애순','culture','미용','승달산길 6','associate'],['목대부리또','food','분식','승달산길 31','associate'],['봉구스밥버거','food','분식','승달산길 25','associate'],['도스마스 목포대점','food','분식','승달산길 19','associate'],['하나씽크','life','주방·인테리어','도림길 86','associate'],['카츠림','food','일식','승달산길 41','associate'],['도림리마을커피','cafe','카페','승달산길 23','associate'],['청계열쇠','life','열쇠','영산로 1686','associate'],['옐로우번','food','베이커리','영산로 1690-1','associate'],['큐당구클럽','culture','생활체육','승달산길 17','associate'],['목대일번지','food','음식점','승달산길 15','associate'],['맘스터치 목포대점','food','패스트푸드','승달산길 24','associate'],['CU 캠퍼스시티점','life','편의점','도림길 74','associate'],['청기와감자탕','food','한식','승달산길 20','associate'],['청춘치킨','food','치킨','도림길 90','associate'],['청계인쇄소','culture','인쇄','도림길 90','associate'],['길손기사식당','food','한식','도림길 19','associate'],['유앤미헤어','culture','미용','청계중앙길 8-6','associate'],['통큰돈가스','food','양식','승달산길 28-2','associate'],['또또와김밥','food','분식','도림길 81-2','associate'],['아몬드식당','food','한식','승달산길 43','associate'],['나눔디자인','culture','디자인','도림길 87-23','associate'],['솔집','cafe','카페','승달산길 33-1','associate'],['푸르른미술교습소','culture','교육','청계중앙길 6','associate']
].map(([n,c,t,a,m])=>({n,c,t,a,m}));
let shops=[...fallbackShops];
const labels={food:'음식·외식',cafe:'카페·디저트',life:'생활·편의',culture:'문화·서비스'};
const memberLabels={regular:'정회원',associate:'준회원'};
const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const marketMapElement=document.querySelector('#marketMap'),mapDetail=document.querySelector('#mapDetail'),mapDirectory=document.querySelector('#mapDirectory'),mapSearch=document.querySelector('#mapSearch'),mapCount=document.querySelector('#mapCount'),mapDirectoryCount=document.querySelector('#mapDirectoryCount');
const todayPickCard=document.querySelector('#todayPickCard'),todayPickName=document.querySelector('#todayPickName'),todayPickMeta=document.querySelector('#todayPickMeta'),todayPickRefresh=document.querySelector('#todayPickRefresh'),todayBenefitList=document.querySelector('#todayBenefitList'),todayBenefitCount=document.querySelector('#todayBenefitCount'),todayDiscoveryStatus=document.querySelector('#todayDiscoveryStatus'),benefitOnlyToggle=document.querySelector('#benefitOnlyToggle'),benefitFilterCount=document.querySelector('#benefitFilterCount');
const sceneDiscovery=document.querySelector('#sceneDiscovery'),sceneDiscoveryTitle=document.querySelector('#sceneDiscoveryTitle'),sceneDiscoveryStatus=document.querySelector('#sceneDiscoveryStatus'),sceneCards=document.querySelector('#sceneCards');
let todayPickOffset=0;
let memberFilter='all',categoryFilter='all',benefitOnly=false,activeScene='';
const markerByIndex=new Map();
const clusterLabels={
 seungdal:'승달산길',
 dorim:'도림길',
 generic:'청계면 생활상권',
 dorimri:'도림리',
 campus:'목포대 캠퍼스',
 yeongsan:'영산로',
 central:'청계중앙길',
 bokgil:'복길로'
};
function streetCluster(shop){
 if(shop.a.includes('승달산길'))return 'seungdal';
 if(shop.a.includes('도림길'))return 'dorim';
 if(shop.a.includes('대학교'))return 'campus';
 if(shop.a.includes('영산로'))return 'yeongsan';
 if(shop.a.includes('청계중앙길'))return 'central';
 if(shop.a.includes('복길로'))return 'bokgil';
 if(shop.a.includes('도림리'))return 'dorimri';
 return 'generic';
}
function clusterName(shop){return clusterLabels[streetCluster(shop)]||'청계면 상권';}
const ROAD_GEO={
 seungdal:{from:[34.91010,126.43018],to:[34.91002,126.43555],min:3,max:51},
 dorim:{from:[34.91225,126.42945],to:[34.90895,126.43115],min:15,max:95},
 yeongsan:{from:[34.90872,126.43135],to:[34.91108,126.42872],min:1680,max:1702}, central:{from:[34.91002,126.42925],to:[34.91023,126.42715],min:6,max:26},
 campus:{center:[34.91255,126.43725]},
 dorimri:{center:[34.91220,126.43335]},
 bokgil:{center:[34.90775,126.42585]},
 generic:{center:[34.91092,126.42970]}
};
const STORE_EXACT_GEO={
 '다이소목포대점':[34.9104344,126.4303803],
 '승달마트':[34.9098082,126.4306684],
 'gs25':[34.9106338,126.4302960]
};
const ADDRESS_EXACT_GEO={
 '승달산길5':[34.9100703,126.4303233],
 '승달산길7-1':[34.9100699,126.4305260],
 '승달산길29':[34.9098260,126.4329362],
 '도림길60-1':[34.9106253,126.4302599],
 '도림길64':[34.9104238,126.4303319],
 '영산로1696':[34.9102510,126.4304629],
 '청계중앙길12':[34.9102713,126.4287009]
};
const REAL_MAP_BOUNDS=[[34.9072,126.4252],[34.9162,126.4468]];
let marketLeafletMap=null,marketMarkerLayer=null;
function geoKey(value){return String(value||'').replace(/\s+/g,'').toLowerCase();}
function addressNumber(address){
 const match=String(address||'').match(/(?:길|로)\s*(\d+(?:-\d+)?)/);
 return match?Number(match[1].split('-')[0]):null;
}function stableGeoJitter(seed,scale=.00010){
 let h=2166136261;
 for(const ch of String(seed)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
 const a=((h>>>0)%1000)/999*2-1,b=(((h>>>10)>>>0)%1000)/999*2-1;
 return [a*scale,b*scale];
}
function shopGeoPoint(shop,index){
 const exact=STORE_EXACT_GEO[geoKey(shop.n)]||ADDRESS_EXACT_GEO[geoKey(shop.a)];
 if(exact)return {lat:exact[0],lng:exact[1],precision:'exact'};
 const key=streetCluster(shop),cfg=ROAD_GEO[key]||ROAD_GEO.generic,n=addressNumber(shop.a);
 if(cfg.from&&cfg.to&&Number.isFinite(n)){
  const t=Math.max(0,Math.min(1,(n-cfg.min)/Math.max(1,cfg.max-cfg.min)));
  const [jLat,jLng]=stableGeoJitter(`${shop.a}:${shop.n}`,0.000035);
  return {lat:cfg.from[0]+(cfg.to[0]-cfg.from[0])*t+jLat,lng:cfg.from[1]+(cfg.to[1]-cfg.from[1])*t+jLng,precision:'road'};
 }
 const center=cfg.center||ROAD_GEO.generic.center,[jLat,jLng]=stableGeoJitter(`${index}:${shop.n}:${shop.a}`,key==='generic'?0.00055:0.00028);
 return {lat:center[0]+jLat,lng:center[1]+jLng,precision:'area'};
}
function markerNode(marker){return marker?.getElement?.()?.querySelector('.market-pin')||marker?.getElement?.()||null;}
function initMarketMap(){
 if(!marketMapElement||!window.L||marketLeafletMap)return;
 marketMapElement.classList.add('real-road-map');
 marketLeafletMap=L.map(marketMapElement,{zoomControl:true,scrollWheelZoom:false,minZoom:14,maxZoom:19,preferCanvas:true});
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,
  attribution:'&copy; OpenStreetMap contributors'
 }).addTo(marketLeafletMap);
 marketMarkerLayer=L.layerGroup().addTo(marketLeafletMap);
 marketLeafletMap.fitBounds(REAL_MAP_BOUNDS,{padding:[14,14]});
 L.control.scale({imperial:false,position:'bottomleft'}).addTo(marketLeafletMap);
}
function selectedShops(){
 const q=(mapSearch?.value||'').trim().toLowerCase();
 return shops.map((s,i)=>({...s,i})).filter(s=>(memberFilter==='all'||s.m===memberFilter)&&(categoryFilter==='all'||s.c===categoryFilter)&&(!q||[s.n,s.t,s.a,labels[s.c]].join(' ').toLowerCase().includes(q)));
}
let activeShopIndex=null;
const categoryVisuals={food:{icon:'🍜',copy:'먹고 머무는 골목'},cafe:{icon:'☕',copy:'잠시 쉬어가는 골목'},life:{icon:'🛍',copy:'생활이 이어지는 골목'},culture:{icon:'✦',copy:'취향과 서비스의 골목'}};
const shopRegistryIndex=new Map();
const normalizeShopName=value=>String(value||'').toLowerCase().replace(/전남목포대점|무안목포대점|무안캠퍼스시티점|목포대학점|목포대점|목대점|캠퍼스시티점/g,'').replace(/[^0-9a-z가-힣]/g,'');
const PUBLIC_PROFILE_URL='https://renzehysxirjilvdxacv.supabase.co/rest/v1/store_public_profiles?select=store_name,store_address,store_phone,hero_image_url,short_intro,featured_menu_name,featured_menu_price,today_benefit,benefit_until&is_published=eq.true';
const PUBLIC_PROFILE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
let publicStoreProfiles=[];
const normalizeAddress=value=>String(value||'').toLowerCase().replace(/전라남도|전남|무안군|청계면/g,'').replace(/\s+/g,'').replace(/번지/g,'');
function findPublicProfile(shop){const nameKey=normalizeShopName(shop.n),addressKey=normalizeAddress(shop.a);return publicStoreProfiles.find(p=>normalizeShopName(p.store_name)===nameKey)||publicStoreProfiles.find(p=>addressKey&&addressKey!=='상권'&&normalizeAddress(p.store_address)===addressKey)||publicStoreProfiles.find(p=>{const pKey=normalizeShopName(p.store_name);return nameKey.length>=4&&pKey.length>=4&&(pKey.includes(nameKey)||nameKey.includes(pKey));});}
async function loadPublicStoreProfiles(){const selected=activeShopIndex;try{const r=await fetch(PUBLIC_PROFILE_URL,{headers:{apikey:PUBLIC_PROFILE_KEY,Authorization:`Bearer ${PUBLIC_PROFILE_KEY}`}});if(!r.ok)throw new Error('profile_http');publicStoreProfiles=await r.json();renderMap();renderTodayDiscovery();renderSceneRecommendations();if(selected!==null&&(!benefitOnly||hasActiveBenefit(shops[selected])))selectShop(selected);}catch{publicStoreProfiles=[];renderMap();renderTodayDiscovery();renderSceneRecommendations();if(selected!==null&&!benefitOnly)selectShop(selected);}}
function koreaToday(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),o=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${o.year}-${o.month}-${o.day}`;}
function activeBenefitProfile(shop){const profile=findPublicProfile(shop),today=koreaToday();return profile?.today_benefit&&(!profile.benefit_until||profile.benefit_until>=today)?profile:null;}
function hasActiveBenefit(shop){return Boolean(activeBenefitProfile(shop));}
function activeBenefitEntries(){return shops.map((shop,index)=>({shop,index,profile:activeBenefitProfile(shop)})).filter(x=>x.profile);}
const storeEventThrottle=new Map();
function trackStoreEvent(index,eventType,source){const shop=shops[index];if(!shop)return;const key=`${index}:${eventType}:${source}`,now=Date.now();if(now-(storeEventThrottle.get(key)||0)<900)return;storeEventThrottle.set(key,now);const endpoint=window.CGMA_ROUTE?.route('/api/store-events')||'/api/store-events';fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({store_name:shop.n,event_type:eventType,source}),keepalive:true}).catch(()=>{});}
const sceneCatalog={lunch:{icon:'🍚',test:s=>s.c==='food'&&!/(주점|호프|맥주|술|pub|bar)/i.test(`${s.t} ${s.n}`)},cafe:{icon:'☕',test:s=>s.c==='cafe'},dinner:{icon:'🌙',test:s=>s.c==='food'},life:{icon:'🛍',test:s=>s.c==='life'||s.c==='culture'}};
const sceneCopy={'ko-KR':{title:'지금 청계에서',lunch:'점심',cafe:'카페',dinner:'저녁',life:'생활',pick:'추천',status:{lunch:'든든한 점심 한 끼를 골라봤어요.',cafe:'잠시 쉬어갈 카페 세 곳을 골라봤어요.',dinner:'저녁에 들르기 좋은 곳을 골라봤어요.',life:'생활과 서비스에 필요한 곳을 골라봤어요.'}},en:{title:'Quick picks in Cheonggye',lunch:'Lunch',cafe:'Cafe',dinner:'Dinner',life:'Local life',pick:'Pick',status:{lunch:'Three lunch spots for right now.',cafe:'Three cafes for a short break.',dinner:'Three places for dinner.',life:'Three useful local shops and services.'}},'zh-CN':{title:'现在去清溪哪里',lunch:'午餐',cafe:'咖啡',dinner:'晚餐',life:'生活',pick:'推荐',status:{lunch:'为你选了三家午餐店。',cafe:'为你选了三家适合休息的咖啡店。',dinner:'为你选了三家晚餐去处。',life:'为你选了三家生活服务店。'}},ja:{title:'いま清渓で',lunch:'ランチ',cafe:'カフェ',dinner:'夕食',life:'暮らし',pick:'おすすめ',status:{lunch:'ランチにおすすめの3店です。',cafe:'ひと休みにおすすめのカフェ3店です。',dinner:'夕食におすすめの3店です。',life:'暮らしに役立つ3店です。'}},vi:{title:'Gợi ý ngay tại Cheonggye',lunch:'Bữa trưa',cafe:'Cà phê',dinner:'Bữa tối',life:'Tiện ích',pick:'Gợi ý',status:{lunch:'Ba địa điểm phù hợp cho bữa trưa.',cafe:'Ba quán cà phê để nghỉ chân.',dinner:'Ba địa điểm phù hợp cho bữa tối.',life:'Ba cửa hàng và dịch vụ hữu ích.'}},ne:{title:'अहिले Cheonggye मा',lunch:'दिउँसो खाना',cafe:'क्याफे',dinner:'बेलुकी खाना',life:'दैनिक सेवा',pick:'सिफारिस',status:{lunch:'दिउँसो खानाका लागि तीन ठाउँ।',cafe:'आराम गर्न तीन क्याफे।',dinner:'बेलुकी खानाका लागि तीन ठाउँ।',life:'दैनिक कामका लागि तीन उपयोगी ठाउँ।'}}};
const sceneLocale=()=>window.CGMANativeI18n?.getLocale?.()||document.documentElement.dataset.ekodiLocale||'ko-KR';
function koreaHour(){return Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',hour:'2-digit',hourCycle:'h23'}).format(new Date()));}
function defaultScene(){const h=koreaHour();return h>=11&&h<14?'lunch':h>=14&&h<17?'cafe':h>=17&&h<21?'dinner':'life';}
function sceneHash(key,shop,index){const seed=`${koreaToday()}:${key}:${normalizeShopName(shop.n)}:${index}`;let h=0;for(const ch of seed)h=(h*31+ch.charCodeAt(0))%1000003;return h;}
function sceneRecommendations(key,limit=3){const config=sceneCatalog[key]||sceneCatalog.life;return shops.map((shop,index)=>({...shop,index})).filter(config.test).map(x=>({...x,profile:findPublicProfile(x),benefit:activeBenefitProfile(x),hash:sceneHash(key,x,x.index)})).sort((a,b)=>Number(Boolean(b.benefit))-Number(Boolean(a.benefit))||Number(Boolean(b.profile?.featured_menu_name))-Number(Boolean(a.profile?.featured_menu_name))||Number(b.m==='regular')-Number(a.m==='regular')||a.hash-b.hash).slice(0,limit);}
function renderSceneRecommendations(){if(!sceneDiscovery||!sceneCards)return;if(!sceneCatalog[activeScene])activeScene=defaultScene();const copy=sceneCopy[sceneLocale()]||sceneCopy.en,config=sceneCatalog[activeScene],items=sceneRecommendations(activeScene);sceneDiscoveryTitle.textContent=copy.title;sceneDiscoveryStatus.textContent=copy.status[activeScene];document.querySelectorAll('[data-scene]').forEach(button=>{const key=button.dataset.scene,active=key===activeScene;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));button.textContent=`${sceneCatalog[key].icon} ${copy[key]}`;});sceneCards.innerHTML=items.map((item,rank)=>`<button type="button" class="scene-card${item.benefit?' has-benefit':''}" data-scene-shop="${item.index}"><span>${config.icon} ${copy.pick} ${rank+1}</span><b>${esc(item.n)}</b><small>${esc(item.profile?.featured_menu_name||item.t)} · ${esc(clusterName(item))} · ${memberLabels[item.m]}</small>${item.benefit?`<em>🎁 ${esc(item.benefit.today_benefit)}</em>`:''}</button>`).join('');sceneCards.querySelectorAll('[data-scene-shop]').forEach(button=>button.addEventListener('click',()=>revealRecommendedShop(Number(button.dataset.sceneShop),`scene_${activeScene}`)));}
function shopIndexForProfile(profile){const nameKey=normalizeShopName(profile?.store_name),addressKey=normalizeAddress(profile?.store_address);let i=shops.findIndex(shop=>normalizeShopName(shop.n)===nameKey);if(i<0&&addressKey)i=shops.findIndex(shop=>normalizeAddress(shop.a)===addressKey);if(i<0&&nameKey.length>=4)i=shops.findIndex(shop=>{const key=normalizeShopName(shop.n);return key.length>=4&&(key.includes(nameKey)||nameKey.includes(key));});return i;}
function revealRecommendedShop(index,source='recommendation'){if(index<0||!shops[index])return;if(source)trackStoreEvent(index,'recommendation_click',source);if(mapSearch)mapSearch.value='';memberFilter='all';categoryFilter='all';benefitOnly=false;document.querySelectorAll('[data-member-filter],[data-category-filter]').forEach(button=>button.classList.toggle('active',button.dataset.memberFilter==='all'||button.dataset.categoryFilter==='all'));renderMap();selectShop(index);mapDetail?.scrollIntoView({behavior:'smooth',block:'nearest'});}
function renderTodayDiscovery(){if(!todayPickCard)return;const today=koreaToday(),food=shops.map((shop,i)=>({...shop,i})).filter(shop=>shop.c==='food'),seed=[...today].reduce((sum,ch)=>sum+ch.charCodeAt(0),0),pick=food[(seed+todayPickOffset)%food.length],pickProfile=findPublicProfile(pick),benefits=activeBenefitEntries().map(({profile,index})=>({profile,index}));todayPickCard.dataset.shopIndex=String(pick.i);todayPickName.textContent=pick.n;const menu=pickProfile?.featured_menu_name?`대표메뉴 · ${pickProfile.featured_menu_name}`:pick.t;todayPickMeta.textContent=`${menu} · ${clusterName(pick)} · ${memberLabels[pick.m]}`;todayBenefitCount.textContent=`${benefits.length}곳`;todayDiscoveryStatus.textContent=benefits.length?`오늘 등록된 혜택 ${benefits.length}곳과 함께 골라보세요.`:'오늘 한 곳을 골라드려요. 상인이 혜택을 등록하면 여기에 바로 나타납니다.';todayBenefitList.innerHTML=benefits.length?benefits.slice(0,4).map(({profile,index})=>`<button type="button" class="today-benefit-card" data-today-shop="${index}"><span>혜택</span><b>${esc(shops[index].n)}</b><small>${esc(profile.today_benefit)}${profile.benefit_until?` · ${esc(profile.benefit_until)}까지`:''}</small></button>`).join(''):'<p class="today-benefit-empty">지금 공개된 오늘의 혜택은 없습니다. 점포 운영자가 등록하면 자동으로 표시됩니다.</p>';todayBenefitList.querySelectorAll('[data-today-shop]').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.todayShop);trackStoreEvent(index,'benefit_click','today_benefit');revealRecommendedShop(index,'');}));}
const fullShopAddress=shop=>shop.a==='청계면 상권'?'전남 무안군 청계면 상권':`전남 무안군 청계면 ${shop.a}`;
function relatedShops(index,limit=3){
 const current=shops[index],cluster=streetCluster(current),origin=shopGeoPoint(current,index);
 return shops.map((shop,i)=>({...shop,i,geo:shopGeoPoint(shop,i)})).filter(x=>x.i!==index&&streetCluster(x)===cluster&&(!markerByIndex.size||markerByIndex.has(x.i))).sort((a,b)=>((a.geo.lat-origin.lat)**2+(a.geo.lng-origin.lng)**2)-((b.geo.lat-origin.lat)**2+(b.geo.lng-origin.lng)**2)||Number(b.m==='regular')-Number(a.m==='regular')||a.i-b.i).slice(0,limit);
}
function selectShop(index){
 const s=shops[index];if(!s||!mapDetail)return;activeShopIndex=index;
 const cluster=streetCluster(s),related=relatedShops(index),relatedIds=new Set(related.map(x=>x.i));
 markerByIndex.forEach((marker,i)=>{const node=markerNode(marker);if(!node)return;node.classList.toggle('active',i===index);node.classList.toggle('related',i!==index&&relatedIds.has(i));});
 const activeMarker=markerByIndex.get(index);if(activeMarker&&marketLeafletMap)marketLeafletMap.panTo(activeMarker.getLatLng(),{animate:true,duration:.25});
 document.querySelectorAll('.directory-item').forEach(p=>p.classList.toggle('active',Number(p.dataset.index)===index));
 const fullAddress=fullShopAddress(s),destination=encodeURIComponent(fullAddress),registry=shopRegistryIndex.get(normalizeShopName(s.n)),profile=findPublicProfile(s),geo=shopGeoPoint(s,index);
 const directions=`<div class="map-directions"><a data-store-direction="naver" href="https://map.naver.com/p/search/${destination}" target="_blank" rel="noopener noreferrer">네이버지도 ↗</a><a data-store-direction="kakao" href="https://map.kakao.com/link/search/${destination}" target="_blank" rel="noopener noreferrer">길찾기 ↗</a></div>`;
 const memberClass=s.m==='regular'?'regular':'associate',memberLabel=memberLabels[s.m],visual=categoryVisuals[s.c]||categoryVisuals.culture;
 const publicPhone=profile?.store_phone||registry?.phone||'';
 const phone=publicPhone?`<div><dt>공개 대표전화</dt><dd><a class="map-phone" href="tel:${publicPhone.replace(/\D/g,'')}">${esc(publicPhone)}</a></dd></div>`:'';
 const relatedHtml=related.length?`<section class="store-nearby"><div class="store-nearby-head"><span>같은 골목에서 함께 보기</span><small>${esc(clusterName(s))}</small></div><div class="store-nearby-list">${related.map(x=>`<button type="button" data-map-related="${x.i}"><span>${categoryVisuals[x.c]?.icon||'•'}</span><b>${esc(x.n)}</b><small>${esc(x.t)}</small></button>`).join('')}</div><p>실제 도로 기반 개략 위치에서 가까운 순으로 보여드립니다.</p></section>`:'';
 const benefitActive=Boolean(activeBenefitProfile(s));
 const visualHtml=profile?.hero_image_url?`<figure class="store-photo"><img src="${esc(profile.hero_image_url)}" alt="${esc(s.n)} 대표사진" loading="lazy"/><figcaption><small>${esc(clusterName(s))}</small><b>상인이 직접 등록한 대표사진</b></figcaption></figure>`:`<div class="store-visual category-${s.c}"><div class="store-visual-glyph">${visual.icon}</div><div><small>${esc(clusterName(s))}</small><b>${visual.copy}</b></div></div>`;
 const intro=profile?.short_intro||(s.m==='regular'?'청계면상인회 정회원 상가입니다. 지역 안에서 소비가 순환할 수 있도록 방문과 관심으로 함께해 주세요.':'준회원 상가로 등록된 기본 안내입니다.');
 const featured=profile?.featured_menu_name?`<section class="store-featured"><span>대표메뉴</span><b>${esc(profile.featured_menu_name)}</b>${profile.featured_menu_price!==null&&profile.featured_menu_price!==undefined?`<strong>${Number(profile.featured_menu_price).toLocaleString('ko-KR')}원</strong>`:''}</section>`:'';
 const benefit=benefitActive?`<section class="store-benefit"><span>오늘의 혜택</span><b>${esc(profile.today_benefit)}</b>${profile.benefit_until?`<small>${esc(profile.benefit_until)}까지</small>`:''}</section>`:'';
 const ownerUpdated=profile?'<span class="store-owner-updated">상인이 직접 업데이트</span>':'';
 const locationMode=geo.precision==='exact'?'공개 지도 좌표 확인':geo.precision==='road'?'도로명 구간 기반 개략 위치':'상권 중심 개략 위치';
 const locationNote=geo.precision==='area'?'상세 좌표가 확인되지 않아 해당 골목·상권 중심에 개략 표시했습니다. 정확한 건물 위치는 아래 길찾기로 확인해 주세요.':'실제 도로 지도를 기준으로 위치를 표시했습니다. 건물 출입구 등 최종 방문 위치는 아래 길찾기로 확인해 주세요.';
 mapDetail.innerHTML=`${visualHtml}<div class="map-detail-heading"><span class="map-detail-number">${index+1}</span><div><h3>${esc(s.n)}</h3><div class="map-detail-badges"><span class="member-status ${memberClass}">${memberLabel}</span><span class="map-detail-tag">${labels[s.c]}</span>${ownerUpdated}</div></div></div><p>${esc(intro)}</p>${featured}${benefit}<dl><div><dt>업종</dt><dd>${esc(s.t)}</dd></div><div><dt>주소</dt><dd>${esc(fullAddress)}</dd></div>${phone}<div><dt>골목 구분</dt><dd>${esc(clusterName(s))}</dd></div><div><dt>지도 위치 기준</dt><dd>${locationMode}</dd></div></dl>${relatedHtml}<div class="location-caution">${locationNote}</div>${directions}`;
 mapDetail.querySelectorAll('[data-map-related]').forEach(button=>button.addEventListener('click',()=>{const relatedIndex=Number(button.dataset.mapRelated);trackStoreEvent(relatedIndex,'detail_open','related');selectShop(relatedIndex)}));mapDetail.querySelectorAll('[data-store-direction]').forEach(link=>link.addEventListener('click',()=>trackStoreEvent(index,'directions_click',link.dataset.storeDirection)));
}
function renderMap(){
 const benefitCount=activeBenefitEntries().length;if(benefitOnly&&benefitCount===0)benefitOnly=false;
 const list=selectedShops(),allCount=shops.length,regularCount=shops.filter(s=>s.m==='regular').length,associateCount=shops.filter(s=>s.m==='associate').length;
 document.querySelector('#summaryAll')&&(document.querySelector('#summaryAll').textContent=allCount+'개');document.querySelector('#summaryRegular')&&(document.querySelector('#summaryRegular').textContent=regularCount+'개');document.querySelector('#summaryAssociate')&&(document.querySelector('#summaryAssociate').textContent=associateCount+'개');if(mapCount)mapCount.textContent=`표시 상가 ${list.length}곳`;if(mapDirectoryCount)mapDirectoryCount.textContent=`총 ${list.length}개`;
 if(benefitFilterCount)benefitFilterCount.textContent=String(benefitCount);if(benefitOnlyToggle){benefitOnlyToggle.classList.toggle('active',benefitOnly);benefitOnlyToggle.setAttribute('aria-pressed',String(benefitOnly));benefitOnlyToggle.disabled=benefitCount===0&&!benefitOnly;}
 initMarketMap();markerByIndex.clear();marketMarkerLayer?.clearLayers();
 if(marketMarkerLayer&&window.L){list.forEach(s=>{const p=shopGeoPoint(s,s.i),hasBenefit=hasActiveBenefit(s),badge=hasBenefit?'<span class="benefit-pin-badge" aria-hidden="true">🎁</span>':'';const icon=window.L.divIcon({className:'market-pin-shell',html:`<span class="market-pin ${s.m}${hasBenefit?' has-benefit':''}${p.precision==='area'?' approximate':''}">${s.i+1}${badge}</span>`,iconSize:[30,34],iconAnchor:[15,17]});const marker=window.L.marker([p.lat,p.lng],{icon,title:`${s.n} · ${memberLabels[s.m]} · ${clusterName(s)}`,keyboard:true,riseOnHover:true}).addTo(marketMarkerLayer);marker.bindTooltip(`${esc(s.n)} · ${esc(s.t)}`,{direction:'top',offset:[0,-10]});marker.on('click',()=>{trackStoreEvent(s.i,'detail_open','map_pin');selectShop(s.i)});markerByIndex.set(s.i,marker);});}
 if(mapDirectory)mapDirectory.innerHTML=list.map(s=>`<button class="directory-item ${s.m}${hasActiveBenefit(s)?' has-benefit':''}" data-index="${s.i}" type="button"><span class="directory-number">${s.i+1}</span><span><b>${esc(s.n)}${hasActiveBenefit(s)?'<i class="directory-benefit" aria-label="오늘 혜택">🎁</i>':''}</b><small>${esc(s.t)} · ${memberLabels[s.m]}</small></span></button>`).join('');
 document.querySelectorAll('.directory-item[data-index]').forEach(el=>el.addEventListener('click',()=>{const index=Number(el.dataset.index);trackStoreEvent(index,'detail_open','directory');selectShop(index)}));
 if(list.length)selectShop(list[0].i);else if(mapDetail)mapDetail.innerHTML='<span class="map-detail-tag">검색 결과 없음</span><h3>조건을 바꿔보세요</h3><p>상가명이나 업종을 다시 입력해 주세요.</p>';
}
initMarketMap();
const merchantApiPath=window.CGMA_ROUTE?.route('/api/merchants')||'/api/merchants';
const merchantDirectoryPromise=fetch(merchantApiPath,{cache:'no-store'}).then(async response=>{if(!response.ok)throw new Error('merchant_directory_failed');return response.json()}).catch(error=>{console.warn('CGMA merchant directory fallback',error);return null});
merchantDirectoryPromise.then(data=>{if(!data?.items?.length)return;shops=data.items.map(item=>({id:item.id,n:item.name,c:item.category||'life',t:item.industry||'생활·편의',a:item.address||'청계면 상권',m:item.membership||'associate',phone:item.phone||''}));renderMap();renderTodayDiscovery();renderSceneRecommendations();});
document.querySelectorAll('[data-member-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-member-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');memberFilter=btn.dataset.memberFilter;renderMap()}));
document.querySelectorAll('[data-category-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-category-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');categoryFilter=btn.dataset.categoryFilter;renderMap()}));
mapSearch?.addEventListener('input',renderMap);
benefitOnlyToggle?.addEventListener('click',()=>{benefitOnly=!benefitOnly;renderMap();});
todayPickCard?.addEventListener('click',()=>revealRecommendedShop(Number(todayPickCard.dataset.shopIndex),'today_pick'));
todayPickRefresh?.addEventListener('click',()=>{todayPickOffset=(todayPickOffset+1)%Math.max(1,shops.filter(shop=>shop.c==='food').length);renderTodayDiscovery();});
document.querySelectorAll('[data-scene]').forEach(button=>button.addEventListener('click',()=>{activeScene=button.dataset.scene;renderSceneRecommendations();}));
window.addEventListener('ekodi:locale-change',()=>renderSceneRecommendations());
let mapResizeTimer;window.addEventListener('resize',()=>{clearTimeout(mapResizeTimer);mapResizeTimer=setTimeout(()=>marketLeafletMap?.invalidateSize(),120)},{passive:true});
renderMap();
renderTodayDiscovery();
renderSceneRecommendations();
loadPublicStoreProfiles();
let benefitDay=koreaToday();setInterval(()=>{const day=koreaToday();if(day!==benefitDay){benefitDay=day;renderMap();renderTodayDiscovery();renderSceneRecommendations();}},60000);

const menu=document.querySelector('.menu-btn'),nav=document.querySelector('#nav');
menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open)});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}));

const cgmaRoute=value=>window.CGMA_ROUTE?.route(value)||value;
const escapeHtml=esc,newsFeed=document.querySelector('#newsFeed'),newsStatus=document.querySelector('#newsStatus'),refreshNews=document.querySelector('#refreshNews');
let newsType='support';
async function loadNews(){
 if(!newsFeed)return;newsStatus.textContent='공식기관의 최신 공고를 불러오는 중입니다.';newsFeed.innerHTML='<div class="news-empty">소식을 확인하고 있습니다…</div>';
 try{const response=await fetch(cgmaRoute(`/api/news?type=${encodeURIComponent(newsType)}&t=${Date.now()}`));if(!response.ok)throw new Error('news');const data=await response.json();if(!data.items?.length)throw new Error('empty');
 newsFeed.innerHTML=data.items.map(item=>{const d=new Date(item.publishedAt);const date=item.publishedAt&&!Number.isNaN(d.valueOf())?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric'}).format(d):'최근 공고';return `<article class="auto-news-card"><span class="source">${escapeHtml(item.source)}</span><h3>${escapeHtml(item.title)}</h3><time>${date}</time><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">출처에서 공고 확인 →</a></article>`}).join('');
 newsStatus.textContent=`${data.items.length}건 · 공식 출처 기준 15분마다 갱신`;}catch{newsFeed.innerHTML='<div class="news-empty"><b>지금은 새 공고를 불러오지 못했습니다.</b><p>잠시 후 새로고침해 주세요.</p></div>';newsStatus.textContent='공식 출처 연결을 다시 확인하고 있습니다.';}
}
document.querySelectorAll('[data-news]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-news]').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false')});button.classList.add('active');button.setAttribute('aria-selected','true');newsType=button.dataset.news;loadNews()}));
refreshNews?.addEventListener('click',loadNews);loadNews();

const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co',SUPABASE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const authMessage=document.querySelector('#authMessage'),authClient=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);
const noticeList=document.querySelector('#associationNoticeList'),noticeWriteToggle=document.querySelector('#noticeWriteToggle'),noticeEditor=document.querySelector('#noticeEditor'),noticeForm=document.querySelector('#noticeForm'),noticeFormStatus=document.querySelector('#noticeFormStatus');
let noticeEditorAllowed=false;
const noticeDate=value=>{const date=new Date(value);return Number.isNaN(date.valueOf())?'최근 등록':new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric'}).format(date)};
async function loadNotices(){if(!noticeList)return;try{const response=await fetch(cgmaRoute(`/api/notices?t=${Date.now()}`));if(!response.ok)throw new Error('notice');const data=await response.json(),items=data.items||[];noticeList.innerHTML=items.length?items.map(item=>`<article class="notice-card${item.pinned?' pinned':''}"><div class="notice-meta"><span>${item.pinned?'중요 · ':''}${escapeHtml(item.category||'공지')}</span><time>${noticeDate(item.created_at)}</time></div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.content).replace(/\n/g,'<br>')}</p><div class="notice-footer"><span>${escapeHtml(item.author||'청계면상인회')}</span>${noticeEditorAllowed?`<button class="notice-delete" type="button" data-notice-delete="${Number(item.id)}">삭제</button>`:''}</div></article>`).join(''):'<div class="notice-loading">등록된 공지사항이 없습니다.</div>';}catch{noticeList.innerHTML='<div class="notice-loading">공지사항을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.</div>';}}
noticeWriteToggle?.addEventListener('click',()=>{noticeEditor.hidden=!noticeEditor.hidden;noticeWriteToggle.textContent=noticeEditor.hidden?'공지 작성':'작성 닫기'});
noticeForm?.addEventListener('submit',async event=>{event.preventDefault();noticeFormStatus.textContent='공지를 등록하고 있습니다.';const {data}=await authClient.auth.getSession(),session=data.session;if(!session){noticeFormStatus.textContent='로그인 후 다시 시도해 주세요.';return}const form=new FormData(noticeForm),response=await fetch(cgmaRoute('/api/notices'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({category:form.get('category'),title:form.get('title'),content:form.get('content'),pinned:form.get('pinned')==='on'})});if(response.ok){noticeForm.reset();noticeEditor.hidden=true;noticeWriteToggle.textContent='공지 작성';noticeFormStatus.textContent='등록되었습니다.';await loadNotices()}else noticeFormStatus.textContent='등록 권한을 확인해 주세요.'});
noticeList?.addEventListener('click',async event=>{const button=event.target.closest('[data-notice-delete]');if(!button||!confirm('이 공지를 삭제할까요?'))return;const {data}=await authClient.auth.getSession(),session=data.session;if(!session)return;const response=await fetch(cgmaRoute(`/api/notices?id=${button.dataset.noticeDelete}`),{method:'DELETE',headers:{Authorization:`Bearer ${session.access_token}`}});if(response.ok)loadNotices()});
authClient?.auth.getSession().then(async({data})=>{
 const session=data.session,adminNav=document.querySelector('#adminNav');noticeEditorAllowed=false;
 if(session){try{const response=await fetch(cgmaRoute('/api/admin-session'),{headers:{Authorization:`Bearer ${session.access_token}`}});noticeEditorAllowed=response.ok}catch{noticeEditorAllowed=false}}
 if(adminNav)adminNav.hidden=!noticeEditorAllowed;if(noticeWriteToggle)noticeWriteToggle.hidden=!noticeEditorAllowed;loadNotices();
});
if(!authClient)loadNotices();
document.querySelectorAll('[data-provider]').forEach(button=>button.addEventListener('click',async()=>{const provider=button.dataset.provider;if(!authClient)return;authMessage.textContent='로그인 화면으로 이동합니다…';if(provider==='phone'){authMessage.textContent='휴대전화 로그인은 상인회로 문의해 주세요.';return}const redirectTo=window.CGMA_ROUTE?.absolute('/#login')||new URL('/#login',location.origin).toString();const {error}=await authClient.auth.signInWithOAuth({provider,options:{redirectTo}});if(error)authMessage.textContent='로그인 제공자 설정을 확인해 주세요.'}));

const registeredShops=[
['일오삼','한식','승달산길 36','061-282-1729'],['통큰돈까스','한식','승달산길 28-2',''],['대패세끼','한식','승달산길 29','061-452-6767'],['라커마라탕 목대점','중식','승달산길 33','0507-1413-3348'],['선명출판복사','출판·복사','승달산길 35','061-452-6479'],['토스트굽는사람들','토스트','승달산길 36','061-454-5586'],['커피에빠지다','카페','승달산길 33',''],['행복한커피','카페','승달산길 35','061-279-9909'],['CU 목포대하늘점','편의점','승달산길 41','061-453-5374'],['세븐일레븐 무안목포대점','편의점','승달산길 45','061-452-5559'],['2002컵밥도시락','한식','승달산길 51','061-454-2007'],['참새방앗간','한식','승달산길 51',''],['이모네칼국수','분식','승달산길 41','061-453-3029'],['카페라움','카페','승달산길 43','061-452-4070'],['아몬드','한식','승달산길 43','061-452-5070'],['메가MGC커피 목포대점','카페','승달산길 39','0507-1428-5150'],['자담치킨&피자마루','치킨·피자','승달산길 37-1','061-453-8295'],['꺼벙이식당','분식','승달산길 27','061-452-6610'],['카츠림','돈가스','승달산길 41','0507-1490-9511'],['또또와김밥','분식','도림길 81-2','061-453-0285'],['산들','차·커피','도림길 70-1','061-452-9802'],['다마당구클럽','당구장','승달산길 18','0507-1418-0642'],['컴포즈커피 목포대점','카페','승달산길 24','061-876-7305'],['공차 목포대점','카페','승달산길 24',''],['다이소 목포대점','생활용품','도림길 64','061-453-3994'],['맘스터치 목포대학점','햄버거','승달산길 24','0507-1326-7470'],['1st 헤어샵','미용','승달산길 23','061-454-3390'],['롯데리아 목포대학점','햄버거','승달산길 17','061-454-0005'],['청기와감자탕','한식','승달산길 20','061-454-0068'],['한솥도시락 목포대점','도시락','도림길 87-23','061-454-6004'],['엘로우번','햄버거','영산로 1690-1',''],['목포 못난이도너츠','도너츠','영산로 1690-1',''],['도스마스 목포대점','부리또','승달산길 19',''],['목대부리또','분식','승달산길 31',''],['순이네밥상','한식','승달산길 25','061-454-0518'],['점빵집','찐빵','승달산길 18',''],['세븐일레븐 무안목대후문점','편의점','승달산길 9','061-454-7937'],['아뜰리에','미용','승달산길 22-2',''],['카페IN','카페','도림길 75',''],['왕손창평국밥','국밥','승달산길 18',''],['파리바게뜨 목대점','제과','도림길 71','061-454-8242'],['CU 무안캠퍼스시티점','편의점','도림길 74',''],['신전떡볶이 목포대점','분식','승달산길 36','061-453-9805'],['도쿄라멘3900 목포대점','일본식 라멘','승달산길 31','070-4699-0199'],['고깃집','한식','승달산길 21-1',''],['세븐일레븐 무안도림점','편의점','승달산길 36',''],['GS25 목포대학점','편의점','승달산길 24',''],['김정호스튜디오','사진','승달산길 3',''],['여성힐링찜질방','찜질','도림길 85',''],['승달마트','식품·잡화','도림길 70-2','061-452-6625'],['도야짬뽕 목포대점','중식','승달산길 24','0507-1319-0197'],['봉구스밥버거 목포대점','밥버거','승달산길 25','061-453-0552'],['빽다방 무안목포대점','카페','도림길 87-23',''],['금복주류 전남목포대점','주점','승달산길 24',''],['스타일 바이 애순','미용','승달산길 6',''],['얌샘김밥 목포대점','김밥','승달산길 27-1','061-454-3345'],['완미국밥','국밥','도림길 87-29',''],['큐당구클럽','당구장','승달산길 17',''],['역전할머니맥주 전남목포대점','주점','승달산길 22-2',''],['막이오름 무안목포대점','한식주점','도림길 87-23',''],['골목식당','한식','승달산길 17-6',''],['목대일번지','주점','승달산길 15',''],['마인','주점','승달산길 22-2',''],['술도가','주점','승달산길 17-6',''],['나무숲커피','카페','승달산길 17-5',''],['청계열쇠도장하수구','열쇠·도장','영산로 1686',''],['콩짜장','중식','승달산길 17-4','061-453-1111'],['Y텔레콤','통신','영산로 1686',''],['대림식당','한식','승달산길 13-1','061-452-5179'],['심할머니 안흥찐빵','찐빵','영산로 1686',''],['글림','미용','영산로 1684',''],['아트랜드','미술·공예','승달산길 15','']
].map(([name,industry,address,phone],i)=>({no:i+1,name,industry,address,phone}));
registeredShops.forEach(row=>{const key=normalizeShopName(row.name);if(key&&!shopRegistryIndex.has(key))shopRegistryIndex.set(key,row);});
if(activeShopIndex!==null)selectShop(activeShopIndex);
const registeredBody=document.querySelector('#registeredBody'),registeredSearch=document.querySelector('#registeredSearch'),registeredCount=document.querySelector('#registeredCount');
function renderRegistered(){
 if(!registeredBody)return;const q=(registeredSearch?.value||'').trim().toLowerCase();const list=registeredShops.filter(s=>!q||(`${s.name} ${s.industry} ${s.address}`).toLowerCase().includes(q));
 registeredCount.textContent=`${list.length}개 상가`;
 registeredBody.innerHTML=list.map(s=>{const destination=encodeURIComponent(`전남 무안군 청계면 ${s.address}`),phone=s.phone?`<a class="verified-phone" href="tel:${s.phone.replace(/\D/g,'')}">${s.phone}</a>`:'<span class="phone-unconfirmed">공개 대표전화 미확인</span>';return `<tr><td data-label="번호">${s.no}</td><td data-label="상가명"><b>${esc(s.name)}</b></td><td data-label="업종">${esc(s.industry)}</td><td data-label="주소">전남 무안군 청계면 ${esc(s.address)}</td><td data-label="공개 대표전화">${phone}</td><td data-label="위치"><a class="registered-map-link" href="https://map.naver.com/p/search/${destination}" target="_blank" rel="noopener noreferrer">네이버지도 ↗</a></td></tr>`}).join('');
}
registeredSearch?.addEventListener('input',renderRegistered);renderRegistered();
