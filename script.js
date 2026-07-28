const shops=[
['일오삼','food','음식점','청계면 상권','regular'],['자담치킨','food','치킨','청계면 상권','regular'],['카페IN','cafe','카페','도림길 75','regular'],['하늘애한의원','life','의료','청계면 상권','regular'],['1st헤어샵','culture','미용','청계면 상권','regular'],['메가커피 목포대점','cafe','카페','승달산길 39','regular'],['세븐일레븐 무안목포대점','life','편의점','승달산길 45','regular'],['미스터빈','cafe','카페','청계면 상권','regular'],['참새방앗간','food','음식점','도림리 311-19','regular'],['세븐일레븐 무안도림점','life','편의점','승달산길 36','regular'],['대림식당','food','한식','승달산길 13-1','regular'],['토스트굽는사람들','food','분식','승달산길 36','regular'],['빽다방 목포대점','cafe','카페','도림길 87-23','regular'],['컴포즈커피 목포대점','cafe','카페','승달산길 24','regular'],['평화자기','life','생활용품','청계면 상권','regular'],['무안하다','culture','문화·서비스','청계면 상권','regular'],['우후죽순','food','음식점','승달산길 34','regular'],['산들카페','cafe','카페','도림길 70-1','regular'],['청계화원','life','꽃·식물','도림길 19','regular'],['고깃집','food','한식','승달산길 21-1','regular'],['커피에빠지다','cafe','카페','승달산길 33','regular'],['삼일종합광고','culture','광고·인쇄','도림길 15-2','regular'],['대패세끼','food','한식','승달산길 29','regular'],['롯데리아 목포대점','food','패스트푸드','승달산길 17','regular'],['만남게임랜드','culture','게임·오락','청계면 상권','regular'],['이디야 목포대점','cafe','카페','도림길 92-2','regular'],['아트랜드','life','문구','승달산길 15','regular'],['나주곰탕','food','한식','청계면 상권','regular'],['바른탐정행정사','culture','행정서비스','청계면 상권','regular'],['이모네칼국수','food','분식','승달산길 41','regular'],['다마당구장','culture','생활체육','승달산길 18','regular'],['무안남부신협','life','금융','청계면 상권','regular'],['모모홀딩스','culture','서비스','청계면 상권','regular'],['공차 목포대점','cafe','카페','승달산길 24','regular'],['국제협력처','culture','기관','국립목포대학교','regular'],['안흥찐빵','food','분식','영산로 1686','regular'],['GS25','life','편의점','청계면 상권','regular'],['한국그린케어','life','생활서비스','청계면 상권','regular'],['동경야시장 목포대점','food','주점','승달산길 33','regular'],['행복한커피','cafe','카페','승달산길 35','regular'],['다담코리아','culture','서비스','청계면 상권','regular'],['만복환경자원','life','환경서비스','청계면 상권','regular'],['김정호스튜디오','culture','사진','승달산길 3','regular'],['승달마트','life','마트','도림길 70-2','regular'],['완미국밥','food','국밥','도림길 87-29','regular'],['책마당','life','서점','복길로 131','regular'],['술도가','food','주점','승달산길 17-6','regular'],['노래방','culture','노래방','청계면 상권','regular'],['한식뷔페','food','한식','청계면 상권','regular'],['목대신한은행','life','금융','국립목포대학교','regular'],
['충만치킨피자마루','food','치킨·피자','승달산길 37-1','associate'],['BBQ치킨','food','치킨','승달산길 51','associate'],['파리바게뜨','food','베이커리','도림리 480-2','associate'],['역전할머니맥주','food','주점','승달산길 22-2','associate'],['삼겹본능공수간','food','한식','도림길 55','associate'],['도쿄라멘3900','food','일식','승달산길 31','associate'],['다이소 목포대점','life','생활용품','도림길 64','associate'],['순이네밥상','food','한식','승달산길 25','associate'],['한솥도시락','food','도시락','도림길 87-23','associate'],['명랑핫도그','food','분식','승달산길 33-1','associate'],['인생1횟집','food','횟집','도림길 55','associate'],['스타일바이애순','culture','미용','승달산길 6','associate'],['목대부리또','food','분식','승달산길 31','associate'],['봉구스밥버거','food','분식','승달산길 25','associate'],['도스마스 목포대점','food','분식','승달산길 19','associate'],['하나씽크','life','주방·인테리어','도림길 86','associate'],['카츠림','food','일식','승달산길 41','associate'],['도림리마을커피','cafe','카페','승달산길 23','associate'],['청계열쇠','life','열쇠','영산로 1686','associate'],['옐로우번','food','베이커리','영산로 1690-1','associate'],['큐당구클럽','culture','생활체육','승달산길 17','associate'],['목대일번지','food','음식점','승달산길 15','associate'],['맘스터치 목포대점','food','패스트푸드','승달산길 24','associate'],['CU 캠퍼스시티점','life','편의점','도림길 74','associate'],['청기와감자탕','food','한식','승달산길 20','associate'],['청춘치킨','food','치킨','도림길 90','associate'],['청계인쇄소','culture','인쇄','도림길 90','associate'],['길손기사식당','food','한식','도림길 19','associate'],['유앤미헤어','culture','미용','청계중앙길 8-6','associate'],['통큰돈가스','food','양식','승달산길 28-2','associate'],['또또와김밥','food','분식','도림길 81-2','associate'],['아몬드식당','food','한식','승달산길 43','associate'],['나눔디자인','culture','디자인','도림길 87-23','associate'],['솔집','cafe','카페','승달산길 33-1','associate'],['푸르른미술교습소','culture','교육','청계중앙길 6','associate']
].map(([n,c,t,a,m])=>({n,c,t,a,m}));
const labels={food:'음식·외식',cafe:'카페·디저트',life:'생활·편의',culture:'문화·서비스'};
const memberLabels={regular:'정회원',associate:'준회원'};
const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const marketMapElement=document.querySelector('#marketMap'),mapDetail=document.querySelector('#mapDetail'),mapDirectory=document.querySelector('#mapDirectory'),mapSearch=document.querySelector('#mapSearch'),mapCount=document.querySelector('#mapCount');
let memberFilter='all',leafletMap,markerLayer;
const markerByIndex=new Map();
const categoryColors={food:'#ff6038',cafe:'#8a5cff',life:'#e2a719',culture:'#1f8065'};
function latLngFor(shop,index){
 const number=Number(shop.a.match(/(\d+)/)?.[1]||0),jitter=((index%7)-3)*0.000035;
 if(shop.a.includes('승달산길'))return [34.91325+Math.sin(number)*0.00034+jitter,126.4338+Math.min(number,55)*0.00015];
 if(shop.a.includes('도림길'))return [34.9094+Math.min(number,100)*0.000046,126.42965+Math.sin(number*.7)*0.00038+jitter];
 if(shop.a.includes('영산로'))return [34.9118+jitter,126.4421+(number-1686)*0.00007];
 if(shop.a.includes('청계중앙길'))return [34.9107+number*0.000035,126.42765+jitter];
 if(shop.a.includes('복길로'))return [34.9162,126.4274];
 if(shop.a.includes('대학교'))return [34.9128+jitter,126.4352+jitter];
 return [34.9122+Math.floor(index/10)*0.00012+jitter,126.4322+(index%10)*0.00016];
}
function selectedShops(){
 const q=(mapSearch?.value||'').trim().toLowerCase();
 return shops.map((s,i)=>({...s,i})).filter(s=>(memberFilter==='all'||s.m===memberFilter)&&(!q||[s.n,s.t,s.a,labels[s.c]].join(' ').toLowerCase().includes(q)));
}
function markerStyle(shop,active=false){
 return {radius:active?11:shop.m==='regular'?8:6,color:shop.m==='regular'?'#ff6038':'#66747d',weight:active?5:3,fillColor:categoryColors[shop.c],fillOpacity:shop.m==='regular'?.96:.72,opacity:1};
}
function selectShop(index,move=true){
 const s=shops[index];if(!s||!mapDetail)return;
 markerByIndex.forEach((marker,i)=>marker.setStyle(markerStyle(shops[i],i===index)).setRadius(i===index?11:shops[i].m==='regular'?8:6));
 document.querySelectorAll('.directory-item').forEach(p=>p.classList.toggle('active',Number(p.dataset.index)===index));
 const fullAddress=`전남 무안군 청계면 ${s.a}`,query=encodeURIComponent(`${s.n} ${fullAddress}`);
 const directions=`<div class="map-directions"><a href="https://www.google.com/maps/search/?api=1&query=${query}" target="_blank" rel="noopener noreferrer">Google 길찾기 ↗</a><a href="https://map.kakao.com/link/search/${query}" target="_blank" rel="noopener noreferrer">카카오맵 길찾기 ↗</a></div>`;
 const detail=s.m==='regular'
 ?`<span class="member-status regular">정회원</span><span class="map-detail-tag">${labels[s.c]}</span><h3>${esc(s.n)}</h3><p>청계면상인회 정회원 상가입니다. 지역 안에서 소비가 순환할 수 있도록 방문과 추천으로 함께해 주세요.</p><dl><div><dt>업종</dt><dd>${esc(s.t)}</dd></div><div><dt>주소</dt><dd>${esc(fullAddress)}</dd></div><div><dt>회원 안내</dt><dd>공동사업과 상권 활성화 활동에 참여하는 정회원입니다.</dd></div></dl>${directions}`
 :`<span class="member-status associate">준회원</span><span class="map-detail-tag">${labels[s.c]}</span><h3>${esc(s.n)}</h3><p>준회원 상가로 등록된 기본 안내입니다.</p><dl><div><dt>업종</dt><dd>${esc(s.t)}</dd></div><div><dt>위치</dt><dd>${esc(fullAddress)}</dd></div></dl><small>준회원 정보는 상호와 업종 중심으로 간단히 제공합니다.</small>${directions}`;
 mapDetail.innerHTML=detail;
 if(move&&leafletMap){leafletMap.panTo(latLngFor(s,index),{animate:true});markerByIndex.get(index)?.openTooltip();}
}
function renderMap(){
 const list=selectedShops();if(mapCount)mapCount.textContent=`표시 상가 ${list.length}곳`;
 markerLayer?.clearLayers();markerByIndex.clear();
 const bounds=[];
 list.forEach(s=>{const pos=latLngFor(s,s.i),marker=L.circleMarker(pos,markerStyle(s)).bindTooltip(`<b>${esc(s.n)}</b><br>${memberLabels[s.m]}`,{direction:'top',offset:[0,-8]});marker.on('click',()=>selectShop(s.i,false));marker.addTo(markerLayer);markerByIndex.set(s.i,marker);bounds.push(pos);});
 if(mapDirectory)mapDirectory.innerHTML=list.map(s=>`<button class="directory-item ${s.m}" data-index="${s.i}" type="button"><span class="directory-number">${s.i+1}</span><span><b>${esc(s.n)}</b><small>${esc(s.t)} · ${memberLabels[s.m]}</small></span></button>`).join('');
 document.querySelectorAll('.directory-item[data-index]').forEach(el=>el.addEventListener('click',()=>selectShop(Number(el.dataset.index))));
 if(bounds.length&&leafletMap)leafletMap.fitBounds(bounds,{padding:[28,28],maxZoom:16});
 if(list.length)selectShop(list[0].i,false);else if(mapDetail)mapDetail.innerHTML='<span class="map-detail-tag">검색 결과 없음</span><h3>조건을 바꿔보세요</h3><p>상가명이나 업종을 다시 입력해 주세요.</p>';
}
if(marketMapElement&&window.L){
 leafletMap=L.map(marketMapElement,{scrollWheelZoom:false,zoomControl:true}).setView([34.9127,126.4345],15);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(leafletMap);
 markerLayer=L.layerGroup().addTo(leafletMap);
 leafletMap.on('focus',()=>leafletMap.scrollWheelZoom.enable());leafletMap.on('blur',()=>leafletMap.scrollWheelZoom.disable());
}
document.querySelectorAll('[data-member-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-member-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');memberFilter=btn.dataset.memberFilter;renderMap()}));
mapSearch?.addEventListener('input',renderMap);renderMap();

const menu=document.querySelector('.menu-btn'),nav=document.querySelector('#nav');
menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open)});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}));

const escapeHtml=esc,newsFeed=document.querySelector('#newsFeed'),newsStatus=document.querySelector('#newsStatus'),refreshNews=document.querySelector('#refreshNews');
let newsType='support';
async function loadNews(){
 if(!newsFeed)return;newsStatus.textContent='공식기관의 최신 공고를 불러오는 중입니다.';newsFeed.innerHTML='<div class="news-empty">소식을 확인하고 있습니다…</div>';
 try{const response=await fetch(`/api/news?type=${encodeURIComponent(newsType)}&t=${Date.now()}`);if(!response.ok)throw new Error('news');const data=await response.json();if(!data.items?.length)throw new Error('empty');
 newsFeed.innerHTML=data.items.map(item=>{const d=new Date(item.publishedAt);const date=item.publishedAt&&!Number.isNaN(d.valueOf())?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric'}).format(d):'최근 공고';return `<article class="auto-news-card"><span class="source">${escapeHtml(item.source)}</span><h3>${escapeHtml(item.title)}</h3><time>${date}</time><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">출처에서 공고 확인 →</a></article>`}).join('');
 newsStatus.textContent=`${data.items.length}건 · 공식 출처 기준 15분마다 갱신`;}catch{newsFeed.innerHTML='<div class="news-empty"><b>지금은 새 공고를 불러오지 못했습니다.</b><p>잠시 후 새로고침해 주세요.</p></div>';newsStatus.textContent='공식 출처 연결을 다시 확인하고 있습니다.';}
}
document.querySelectorAll('[data-news]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-news]').forEach(x=>{x.classList.remove('active');x.setAttribute('aria-selected','false')});button.classList.add('active');button.setAttribute('aria-selected','true');newsType=button.dataset.news;loadNews()}));
refreshNews?.addEventListener('click',loadNews);loadNews();

const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co',SUPABASE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const authMessage=document.querySelector('#authMessage'),authClient=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);
authClient?.auth.getSession().then(({data})=>{const grade=data.session?.user?.app_metadata?.grade||data.session?.user?.app_metadata?.role;const adminNav=document.querySelector('#adminNav');if(adminNav&&['admin','manager'].includes(grade))adminNav.hidden=false});
document.querySelectorAll('[data-provider]').forEach(button=>button.addEventListener('click',async()=>{const provider=button.dataset.provider;if(!authClient)return;authMessage.textContent='로그인 화면으로 이동합니다…';if(provider==='phone'){authMessage.textContent='휴대전화 로그인은 상인회로 문의해 주세요.';return}const {error}=await authClient.auth.signInWithOAuth({provider,options:{redirectTo:'https://cheonggye-market.pages.dev/#login'}});if(error)authMessage.textContent='로그인 제공자 설정을 확인해 주세요.'}));
