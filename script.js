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

const escapeHtml=(value='')=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const newsFeed=document.querySelector('#newsFeed'),newsStatus=document.querySelector('#newsStatus'),refreshNews=document.querySelector('#refreshNews');
let newsType='market';
async function loadNews(){
  if(!newsFeed)return;
  newsStatus.textContent='최신 공개 소식을 불러오는 중입니다.';
  newsFeed.innerHTML='<div class="news-empty">소식을 확인하고 있습니다…</div>';
  try{
    const response=await fetch(`/api/news?type=${encodeURIComponent(newsType)}`);
    if(!response.ok)throw new Error('news');
    const data=await response.json();
    if(!data.items?.length)throw new Error('empty');
    newsFeed.innerHTML=data.items.map(item=>{
      const date=item.publishedAt?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric'}).format(new Date(item.publishedAt)):'최근';
      return `<article class="auto-news-card"><span class="source">${escapeHtml(item.source)}</span><h3>${escapeHtml(item.title)}</h3><time>${date}</time><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">원문 보기 →</a></article>`;
    }).join('');
    newsStatus.textContent=`${data.items.length}건의 최신 소식 · 30분마다 자동 갱신`;
  }catch{
    newsFeed.innerHTML='<div class="news-empty"><b>지금은 새 소식을 불러오지 못했습니다.</b><p>잠시 후 다시 시도하거나 상인회에 직접 소식을 제보해 주세요.</p></div>';
    newsStatus.textContent='자동 수집 연결을 다시 확인하고 있습니다.';
  }
}
document.querySelectorAll('[data-news]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-news]').forEach(item=>{item.classList.remove('active');item.setAttribute('aria-selected','false')});
  button.classList.add('active');button.setAttribute('aria-selected','true');newsType=button.dataset.news;loadNews();
}));
refreshNews?.addEventListener('click',loadNews);loadNews();

const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co';
const SUPABASE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const authMessage=document.querySelector('#authMessage');
const authClient=window.supabase?.createClient(SUPABASE_URL,SUPABASE_KEY);
authClient?.auth.getSession().then(({data})=>{
  const grade=data.session?.user?.app_metadata?.grade||data.session?.user?.app_metadata?.role;
  const adminNav=document.querySelector('#adminNav');
  if(adminNav&&['admin','manager'].includes(grade))adminNav.hidden=false;
});
document.querySelectorAll('[data-provider]').forEach(button=>button.addEventListener('click',async()=>{
  const provider=button.dataset.provider;
  if(provider==='phone'){
    const phone=window.prompt('인증번호를 받을 휴대전화 번호를 입력하세요. 예: 01035018542');
    if(!phone)return;
    const normalized=`+82${phone.replace(/\D/g,'').replace(/^0/,'')}`;
    authMessage.textContent='인증번호를 요청하고 있습니다…';
    const {error}=await authClient.auth.signInWithOtp({phone:normalized});
    authMessage.textContent=error?'휴대전화 인증 서비스 설정 후 이용할 수 있습니다. 상인회로 문의해 주세요.':'문자로 받은 인증번호를 입력해 로그인을 완료해 주세요.';
    return;
  }
  authMessage.textContent='로그인 화면으로 이동합니다…';
  const {error}=await authClient.auth.signInWithOAuth({provider,options:{redirectTo:'https://cheonggye-market.pages.dev/#login'}});
  if(error)authMessage.textContent=`${provider==='kakao'?'카카오':'Google'} 로그인 제공자 설정을 완료한 뒤 이용할 수 있습니다.`;
}));
