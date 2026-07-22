const shops=[
 {n:'대림식당',c:'food',t:'한식',a:'승달산길 13-1',p:'061-452-5179'},
 {n:'완미국밥',c:'food',t:'국밥',a:'도림길 87-29',p:'061-453-6111'},
 {n:'이모네칼국수',c:'food',t:'분식',a:'승달산길 41',p:'061-453-3029'},
 {n:'대패세끼',c:'food',t:'한식',a:'승달산길 29',p:'061-452-6767'},
 {n:'롯데리아 목포대학점',c:'food',t:'햄버거',a:'승달산길 17',p:'061-454-0005'},
 {n:'산들카페',c:'cafe',t:'카페',a:'도림길 70-1',p:'061-452-9802'},
 {n:'카페IN',c:'cafe',t:'카페',a:'도림길 75',p:'061-452-5056'},
 {n:'공차 목포대점',c:'cafe',t:'카페',a:'승달산길 24',p:'061-452-0705'},
 {n:'메가커피 목포대점',c:'cafe',t:'카페',a:'승달산길 39',p:'061-454-5150'},
 {n:'커피에빠지다',c:'cafe',t:'카페',a:'승달산길 33',p:''},
 {n:'승달마트',c:'life',t:'식품·잡화',a:'도림길 70-2',p:'061-452-6625'},
 {n:'아트랜드',c:'life',t:'문구',a:'승달산길 15',p:'061-452-5308'},
 {n:'청계화원',c:'life',t:'꽃·식물',a:'도림길 19',p:''},
 {n:'세븐일레븐 무안도림점',c:'life',t:'편의점',a:'승달산길 36',p:''},
 {n:'김정호 스튜디오',c:'culture',t:'사진',a:'승달산길 3',p:'061-454-0900'},
 {n:'다마당구장',c:'culture',t:'생활체육',a:'승달산길 18',p:''},
 {n:'스타일 바이 애순',c:'culture',t:'미용',a:'승달산길 6',p:'061-452-9669'},
 {n:'바른탐정행정사',c:'culture',t:'행정서비스',a:'청계면',p:''}
];
const labels={food:'맛집',cafe:'카페',life:'생활·편의',culture:'문화·서비스'};
let active='all',expanded=false;
const grid=document.querySelector('#shopGrid'),noResult=document.querySelector('.no-result'),more=document.querySelector('#moreShops'),search=document.querySelector('#shopSearch');
function render(){const q=search.value.trim().toLowerCase();let list=shops.filter(s=>(active==='all'||s.c===active)&&s.n.toLowerCase().includes(q));const visible=expanded||q||active!=='all'?list:list.slice(0,8);grid.innerHTML=visible.map(s=>`<article class="shop-card"><span class="tag">${labels[s.c]}</span><h3>${s.n}</h3><p>전남 무안군 청계면 ${s.a}</p>${s.p?`<b>${s.p}</b>`:''}</article>`).join('');noResult.hidden=list.length>0;more.hidden=q||active!=='all'||list.length<=8;more.innerHTML=expanded?'간단히 보기 <span>−</span>':'가게 더 보기 <span>＋</span>'}
document.querySelectorAll('.filters button').forEach(b=>b.addEventListener('click',()=>{document.querySelector('.filters .active').classList.remove('active');b.classList.add('active');active=b.dataset.filter;render()}));
search.addEventListener('input',render);more.addEventListener('click',()=>{expanded=!expanded;render()});render();
const menu=document.querySelector('.menu-btn'),nav=document.querySelector('#nav');menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',open)});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12});document.querySelectorAll('.value-cards article,.program-list article,.news-grid article').forEach(el=>{el.classList.add('reveal');observer.observe(el)});
