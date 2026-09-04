const shops=[
['일오삼','food','음식점','청계면 상권','regular'],['자담치킨&피자마루','food','치킨·피자','승달산길 37-1','regular'],['카페IN','cafe','카페','도림길 75','regular'],['하늘애한의원','life','의료','청계면 상권','regular'],['1st헤어샵','culture','미용','청계면 상권','regular'],['메가커피 목포대점','cafe','카페','승달산길 39','regular'],['세븐일레븐 무안목포대점','life','편의점','승달산길 45','regular'],['미스터빈','cafe','카페','청계면 상권','regular'],['참새방앗간','food','음식점','도림리 311-19','regular'],['세븐일레븐 무안도림점','life','편의점','승달산길 36','regular'],['대림식당','food','한식','승달산길 13-1','regular'],['토스트굽는사람들','food','분식','승달산길 36','regular'],['빽다방 목포대점','cafe','카페','도림길 87-23','regular'],['컴포즈커피 목포대점','cafe','카페','승달산길 24','regular'],['평화자기','life','생활용품','청계면 상권','regular'],['무안하다','culture','문화·서비스','청계면 상권','regular'],['우후죽순','food','음식점','승달산길 34','regular'],['산들카페','cafe','카페','도림길 70-1','regular'],['청계화원','life','꽃·식물','도림길 19','regular'],['고깃집','food','한식','승달산길 21-1','regular'],['커피에빠지다','cafe','카페','승달산길 33','regular'],['삼일종합광고','culture','광고·인쇄','도림길 15-2','regular'],['대패세끼','food','한식','승달산길 29','regular'],['롯데리아 목포대점','food','패스트푸드','승달산길 17','regular'],['만남게임랜드','culture','게임·오락','청계면 상권','regular'],['이디야 목포대점','cafe','카페','도림길 92-2','regular'],['아트랜드','life','문구','승달산길 15','regular'],['나주곰탕','food','한식','청계면 상권','regular'],['바른탐정행정사','culture','행정서비스','청계면 상권','regular'],['이모네칼국수','food','분식','승달산길 41','regular'],['다마당구장','culture','생활체육','승달산길 18','regular'],['무안남부신협','life','금융','청계면 상권','regular'],['모모홀딩스','culture','서비스','청계면 상권','regular'],['공차 목포대점','cafe','카페','승달산길 24','regular'],['국제협력처','culture','기관','국립목포대학교','regular'],['안흥찐빵','food','분식','영산로 1686','regular'],['GS25','life','편의점','청계면 상권','regular'],['한국그린케어','life','생활서비스','청계면 상권','regular'],['동경야시장 목포대점','food','주점','승달산길 33','regular'],['행복한커피','cafe','카페','승달산길 35','regular'],['다담코리아','culture','서비스','청계면 상권','regular'],['만복환경자원','life','환경서비스','청계면 상권','regular'],['김정호스튜디오','culture','사진','승달산길 3','regular'],['승달마트','life','마트','도림길 70-2','regular'],['완미국밥','food','국밥','도림길 87-29','regular'],['책마당','life','서점','복길로 131','regular'],['술도가','food','주점','승달산길 17-6','regular'],['노래방','culture','노래방','청계면 상권','regular'],['한식뷔페','food','한식','청계면 상권','regular'],['목대신한은행','life','금융','국립목포대학교','regular'],
['BBQ치킨','food','치킨','승달산길 51','associate'],['파리바게뜨','food','베이커리','도림리 480-2','associate'],['역전할머니맥주','food','주점','승달산길 22-2','associate'],['삼겹본능공수간','food','한식','도림길 55','associate'],['도쿄라멘3900','food','일식','승달산길 31','associate'],['다이소 목포대점','life','생활용품','도림길 64','associate'],['순이네밥상','food','한식','승달산길 25','associate'],['한솥도시락','food','도시락','도림길 87-23','associate'],['명랑핫도그','food','분식','승달산길 33-1','associate'],['인생1횟집','food','횟집','도림길 55','associate'],['스타일바이애순','culture','미용','승달산길 6','associate'],['목대부리또','food','분식','승달산길 31','associate'],['봉구스밥버거','food','분식','승달산길 25','associate'],['도스마스 목포대점','food','분식','승달산길 19','associate'],['하나씽크','life','주방·인테리어','도림길 86','associate'],['카츠림','food','일식','승달산길 41','associate'],['도림리마을커피','cafe','카페','승달산길 23','associate'],['청계열쇠','life','열쇠','영산로 1686','associate'],['옐로우번','food','베이커리','영산로 1690-1','associate'],['큐당구클럽','culture','생활체육','승달산길 17','associate'],['목대일번지','food','음식점','승달산길 15','associate'],['맘스터치 목포대점','food','패스트푸드','승달산길 24','associate'],['CU 캠퍼스시티점','life','편의점','도림길 74','associate'],['청기와감자탕','food','한식','승달산길 20','associate'],['청춘치킨','food','치킨','도림길 90','associate'],['청계인쇄소','culture','인쇄','도림길 90','associate'],['길손기사식당','food','한식','도림길 19','associate'],['유앤미헤어','culture','미용','청계중앙길 8-6','associate'],['통큰돈가스','food','양식','승달산길 28-2','associate'],['또또와김밥','food','분식','도림길 81-2','associate'],['아몬드식당','food','한식','승달산길 43','associate'],['나눔디자인','culture','디자인','도림길 87-23','associate'],['솔집','cafe','카페','승달산길 33-1','associate'],['푸르른미술교습소','culture','교육','청계중앙길 6','associate']
].map(([n,c,t,a,m])=>({n,c,t,a,m}));
const labels={food:'음식·외식',cafe:'카페·디저트',life:'생활·편의',culture:'문화·서비스'};
const memberLabels={regular:'정회원',associate:'준회원'};
const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const marketMapElement=document.querySelector('#marketMap'),mapDetail=document.querySelector('#mapDetail'),mapDirectory=document.querySelector('#mapDirectory'),mapSearch=document.querySelector('#mapSearch'),mapCount=document.querySelector('#mapCount'),mapDirectoryCount=document.querySelector('#mapDirectoryCount');
let memberFilter='all',categoryFilter='all';
const markerByIndex=new Map();
function illustrationPoint(shop,index){
 const number=Number(shop.a.match(/(\d+)/)?.[1]||0),jitter=((index%7)-3)*.34;
 if(shop.a.includes('승달산길'))return {x:46+Math.min(number,55)*.48,y:47+Math.sin(number*.6)*5+jitter};
 if(shop.a.includes('도림길'))return {x:26+Math.min(number,100)*.25,y:61+Math.sin(number*.45)*4+jitter};
 if(shop.a.includes('영산로'))return {x:76+Math.min(Math.max(number-1686,0),12)*.45,y:45+jitter};
 if(shop.a.includes('청계중앙길'))return {x:28+Math.min(number,15)*.7,y:39+jitter};
 if(shop.a.includes('복길로'))return {x:23,y:27};
 if(shop.a.includes('대학교'))return {x:57+(index%3)*1.4,y:36+(index%2)*1.6};
 return {x:36+(index%10)*3.7,y:48+Math.floor(index/10)*2.9+jitter};
}
function mapIllustration(){
 if(!marketMapElement)return;
 marketMapElement.innerHTML=`<div class="muan-map-art" role="img" aria-label="무안군 안에서 청계면과 목포대 후문 상권을 중심으로 그린 만화형 상권지도">
   <svg class="muan-map-svg" viewBox="0 0 1000 620" aria-hidden="true">
    <path class="muan-boundary" d="M110 150 Q190 70 310 88 Q390 28 485 84 Q590 46 660 128 Q790 112 858 218 Q922 292 858 380 Q882 478 775 522 Q680 592 565 548 Q475 608 386 542 Q268 574 214 480 Q105 462 132 350 Q55 276 110 150Z"/>
    <path class="hill hill-a" d="M140 198 Q205 122 268 194 Q327 110 387 198"/>
    <path class="hill hill-b" d="M676 165 Q730 102 784 166 Q830 118 872 174"/>
    <path class="road-main" d="M158 402 C278 382 360 315 446 332 S622 408 840 332"/>
    <path class="road-side" d="M274 492 C316 424 346 354 420 272 S535 170 594 122"/>
    <path class="road-side" d="M390 498 C430 446 480 410 534 392 S650 338 728 252"/>
    <path class="stream" d="M160 285 C264 250 326 268 408 244 S574 224 690 268 S802 310 858 280"/>
    <g class="buildings"><rect x="450" y="280" width="84" height="50" rx="8"/><rect x="548" y="318" width="58" height="42" rx="7"/><rect x="340" y="348" width="62" height="44" rx="7"/><rect x="620" y="272" width="64" height="42" rx="7"/><rect x="276" y="304" width="54" height="38" rx="7"/></g>
    <g class="stick-person person-a"><circle cx="470" cy="218" r="12"/><path d="M470 230v45m0-28l-24 20m24-20l24 18m-24 10l-20 32m20-32l22 31"/></g>
    <g class="stick-person person-b"><circle cx="700" cy="388" r="11"/><path d="M700 399v40m0-23l-22 16m22-16l22 17m-22 6l-18 27m18-27l20 27"/></g>
    <g class="stick-person person-c"><circle cx="322" cy="226" r="10"/><path d="M322 237v36m0-20l-19 14m19-14l19 14m-19 6l-17 25m17-25l18 25"/></g>
   </svg>
   <div class="map-art-label county">무안군 안에서만 표시</div><div class="map-art-label cheonggye">청계면</div><div class="map-art-label campus">국립목포대학교</div><div class="map-art-label dorim">도림리</div><div class="map-art-label seungdal">승달산길</div><div class="map-art-label center">목포대 후문 상권</div>
   <div class="map-art-caption"><b>청계면 중심 만화지도</b><span>실제 축척보다 골목의 관계와 상가 찾기에 초점을 둔 안내 그림입니다.</span></div>
   <div class="illustration-markers" id="illustrationMarkers"></div>
 </div>`;
}
function selectedShops(){
 const q=(mapSearch?.value||'').trim().toLowerCase();
 return shops.map((s,i)=>({...s,i})).filter(s=>(memberFilter==='all'||s.m===memberFilter)&&(categoryFilter==='all'||s.c===categoryFilter)&&(!q||[s.n,s.t,s.a,labels[s.c]].join(' ').toLowerCase().includes(q)));
}
function selectShop(index){
 const s=shops[index];if(!s||!mapDetail)return;
 markerByIndex.forEach((marker,i)=>marker.classList.toggle('active',i===index));
 document.querySelectorAll('.directory-item').forEach(p=>p.classList.toggle('active',Number(p.dataset.index)===index));
 const fullAddress=s.a==='청계면 상권'?'전남 무안군 청계면 상권':`전남 무안군 청계면 ${s.a}`,destination=encodeURIComponent(fullAddress);
 const directions=`<div class="map-directions"><a href="https://map.naver.com/p/search/${destination}" target="_blank" rel="noopener noreferrer">네이버지도 ↗</a><a href="https://map.kakao.com/link/search/${destination}" target="_blank" rel="noopener noreferrer">길찾기 ↗</a></div>`;
 const memberClass=s.m==='regular'?'regular':'associate',memberLabel=memberLabels[s.m];
 mapDetail.innerHTML=`<div class="map-detail-heading"><span class="map-detail-number">${index+1}</span><div><h3>${esc(s.n)}</h3><div class="map-detail-badges"><span class="member-status ${memberClass}">${memberLabel}</span><span class="map-detail-tag">${labels[s.c]}</span></div></div></div><p>${s.m==='regular'?'청계면상인회 정회원 상가입니다. 지역 안에서 소비가 순환할 수 있도록 방문과 관심으로 함께해 주세요.':'준회원 상가로 등록된 기본 안내입니다.'}</p><dl><div><dt>업종</dt><dd>${esc(s.t)}</dd></div><div><dt>주소</dt><dd>${esc(fullAddress)}</dd></div><div><dt>회원 구분</dt><dd>${memberLabel}</dd></div></dl><div class="location-caution">그림지도는 청계면 중심의 상권 안내용입니다. 정확한 방문 위치는 등록주소 길찾기를 이용해 주세요.</div>${directions}`;
}
function renderMap(){
 const list=selectedShops(),allCount=shops.length,regularCount=shops.filter(s=>s.m==='regular').length,associateCount=shops.filter(s=>s.m==='associate').length;
 document.querySelector('#summaryAll')&&(document.querySelector('#summaryAll').textContent=allCount+'개');document.querySelector('#summaryRegular')&&(document.querySelector('#summaryRegular').textContent=regularCount+'개');document.querySelector('#summaryAssociate')&&(document.querySelector('#summaryAssociate').textContent=associateCount+'개');if(mapCount)mapCount.textContent=`표시 상가 ${list.length}곳`;if(mapDirectoryCount)mapDirectoryCount.textContent=`총 ${list.length}개`;
 const markerHost=document.querySelector('#illustrationMarkers');markerByIndex.clear();
 if(markerHost){markerHost.innerHTML='';list.forEach(s=>{const p=illustrationPoint(s,s.i),button=document.createElement('button');button.type='button';button.className=`market-pin cartoon-pin ${s.m}`;button.style.left=`${Math.max(9,Math.min(91,p.x))}%`;button.style.top=`${Math.max(12,Math.min(88,p.y))}%`;button.textContent=s.i+1;button.title=`${s.n} · ${memberLabels[s.m]}`;button.setAttribute('aria-label',button.title);button.addEventListener('click',()=>selectShop(s.i));markerHost.appendChild(button);markerByIndex.set(s.i,button);});}
 if(mapDirectory)mapDirectory.innerHTML=list.map(s=>`<button class="directory-item ${s.m}" data-index="${s.i}" type="button"><span class="directory-number">${s.i+1}</span><span><b>${esc(s.n)}</b><small>${esc(s.t)} · ${memberLabels[s.m]}</small></span></button>`).join('');
 document.querySelectorAll('.directory-item[data-index]').forEach(el=>el.addEventListener('click',()=>selectShop(Number(el.dataset.index))));
 if(list.length)selectShop(list[0].i);else if(mapDetail)mapDetail.innerHTML='<span class="map-detail-tag">검색 결과 없음</span><h3>조건을 바꿔보세요</h3><p>상가명이나 업종을 다시 입력해 주세요.</p>';
}
mapIllustration();
document.querySelectorAll('[data-member-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-member-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');memberFilter=btn.dataset.memberFilter;renderMap()}));
document.querySelectorAll('[data-category-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-category-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');categoryFilter=btn.dataset.categoryFilter;renderMap()}));
mapSearch?.addEventListener('input',renderMap);
renderMap();

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
const registeredBody=document.querySelector('#registeredBody'),registeredSearch=document.querySelector('#registeredSearch'),registeredCount=document.querySelector('#registeredCount');
function renderRegistered(){
 if(!registeredBody)return;const q=(registeredSearch?.value||'').trim().toLowerCase();const list=registeredShops.filter(s=>!q||(`${s.name} ${s.industry} ${s.address}`).toLowerCase().includes(q));
 registeredCount.textContent=`${list.length}개 상가`;
 registeredBody.innerHTML=list.map(s=>{const destination=encodeURIComponent(`전남 무안군 청계면 ${s.address}`),phone=s.phone?`<a class="verified-phone" href="tel:${s.phone.replace(/\D/g,'')}">${s.phone}</a>`:'<span class="phone-unconfirmed">공개 대표전화 미확인</span>';return `<tr><td data-label="번호">${s.no}</td><td data-label="상가명"><b>${esc(s.name)}</b></td><td data-label="업종">${esc(s.industry)}</td><td data-label="주소">전남 무안군 청계면 ${esc(s.address)}</td><td data-label="공개 대표전화">${phone}</td><td data-label="위치"><a class="registered-map-link" href="https://map.naver.com/p/search/${destination}" target="_blank" rel="noopener noreferrer">네이버지도 ↗</a></td></tr>`}).join('');
}
registeredSearch?.addEventListener('input',renderRegistered);renderRegistered();
