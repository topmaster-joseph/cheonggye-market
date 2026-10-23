// CGMA-PROGRAMS-001: 청계면상인회 행사·활동 레지스트리(단일 원본 public.cgma_programs)의 화면 투영과
// 사용자 화면 직접관리. 공개 목록은 읽기 전용 RPC, 관리 버튼은 서버(DB)가 상인회 관리자임을
// 확인한 뒤에만 보이며 모든 쓰기는 RPC 내부에서 매번 다시 권한을 검사한다(fail-closed).
(()=>{
'use strict';
const SUPABASE='https://renzehysxirjilvdxacv.supabase.co';
const KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const SESSION_KEY='sb-renzehysxirjilvdxacv-auth-token';
const RETURN_KEY='ekodi_return';
let authReturnError='';
let sdkPromise;
function supabaseClient(){
  sdkPromise=sdkPromise||import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
    .then(({createClient})=>createClient(SUPABASE,KEY,{auth:{detectSessionInUrl:false,persistSession:true}}));
  return sdkPromise;
}
// The central auth hub replaces the URL hash with a one-time OTP. Consume it on
// this origin before the site-admin check, and restore the requested manage view.
const authReady=(async()=>{
  const current=new URL(location.href);
  const hash=new URLSearchParams(current.hash.replace(/^#/,''));
  const tokenHash=hash.get('ekodi_token');
  const requestedView=current.searchParams.get(RETURN_KEY);
  if(!tokenHash&&requestedView===null)return;
  current.searchParams.delete(RETURN_KEY);
  current.hash=requestedView==='manage'?'manage':'';
  // Never leave a one-time OTP in browser history or logs.
  history.replaceState({},document.title,current.pathname+current.search+current.hash);
  if(!tokenHash){
    authReturnError='통합 로그인에서 복귀하지 못했습니다. 다시 로그인해 주세요.';
    return;
  }
  try{
    const sb=await supabaseClient();
    const {data,error}=await sb.auth.verifyOtp({token_hash:tokenHash,type:hash.get('ekodi_type')||'email'});
    if(error||!data?.session?.access_token)throw new Error('invalid_auth_handoff');
  }catch{
    authReturnError='통합 로그인 연결이 완료되지 않았습니다. Google 로그인을 다시 시도해 주세요.';
  }
})();

const route=v=>window.CGMA_ROUTE?.route?window.CGMA_ROUTE.route(v):v;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STATUS_ORDER={'모집중':0,'준비':1,'마감':2,'종료':3};
const STATUS_LABEL={'모집중':'모집 중','준비':'예정','마감':'마감','종료':'종료'};
const CATEGORIES=['교육','행사·축제','모집·신청','설문','공지'];

function token(){
  try{
    const raw=localStorage.getItem(SESSION_KEY);if(!raw)return null;
    const s=JSON.parse(raw);
    if(typeof s?.access_token!=='string'||s.access_token.length<20)return null;
    if(Number(s.expires_at)&&Number(s.expires_at)*1000<Date.now())return null;
    return s.access_token;
  }catch{return null}
}
// An expired but refreshable EKODI session must not send users into a
// repeated login loop. Supabase refreshes it with the existing refresh token.
async function sessionToken(){
  await authReady;
  const active=token();
  if(active)return active;
  let saved;
  try{saved=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}
  if(!saved?.refresh_token)return null;
  try{
    const sb=await supabaseClient();
    const {data,error}=await sb.auth.getSession();
    return error?null:(data?.session?.access_token||null);
  }catch{return null}
}
async function rpc(fn,body,{auth=false,timeout=12000}={}){
  const t=auth?await sessionToken():null;
  if(auth&&!t)throw Object.assign(new Error('login_required'),{code:'login_required'});
  const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeout);
  try{
    const res=await fetch(`${SUPABASE}/rest/v1/rpc/${fn}`,{
      method:'POST',cache:'no-store',signal:ctrl.signal,
      headers:{apikey:KEY,'content-type':'application/json',authorization:'Bearer '+(t||KEY)},
      body:JSON.stringify(body||{})
    });
    const data=await res.json().catch(()=>null);
    if(!res.ok)throw Object.assign(new Error('http_'+res.status),{code:res.status===401?'login_required':'unavailable'});
    return data;
  }finally{clearTimeout(timer)}
}
// Only a positive server answer opens management UI. Any error = not an admin (fail-closed).
let adminCheck;
async function isAdmin(){
  if(!await sessionToken())return false;
  adminCheck=adminCheck||rpc('cgma_is_site_admin',{},{auth:true}).then(v=>v===true).catch(()=>false);
  return adminCheck;
}
function loginUrl(){
  const back=new URL(location.href);
  if(back.hash==='#manage'){
    // The auth hub overwrites the hash; keep the intended view in the URL query.
    back.hash='';
    back.searchParams.set(RETURN_KEY,'manage');
  }else if(back.hash.startsWith('#ekodi_token='))back.hash='';
  return 'https://auth.ekodi.kr/?site=cgma&direct=1&return_to='+encodeURIComponent(back.href);
}
function safeHref(v){
  const raw=String(v||'');
  // Existing registry records still use the pre-split management deep link.
  const s=raw==='/programs/ai-marketing-2026/#manage'?'/programs/ai-marketing-2026/manage/':raw;
  if(/^https:\/\//i.test(s))return s;
  if(s.startsWith('/'))return route(s);
  return '';
}
function card(p,{admin=false}={}){
  const href=safeHref(p.apply_url);
  const img=safeHref(p.image_url);
  const st=STATUS_LABEL[p.status]||p.status;
  return `<article class="cgp-card${p.is_public===false?' cgp-hidden':''}" data-status="${esc(p.status)}">
    ${img?`<div class="cgp-thumb"><img src="${esc(img)}" alt="" loading="lazy" decoding="async"></div>`:''}
    <div class="cgp-body">
      <div class="cgp-tags"><span class="cgp-status st-${esc(p.status)}">${esc(st)}</span><span class="cgp-cat">${esc(p.category)}</span>${p.is_public===false?'<span class="cgp-cat">비공개</span>':''}</div>
      <h3>${esc(p.title)}</h3>
      ${p.period_label?`<p class="cgp-when">${esc(p.period_label)}</p>`:''}
      ${p.summary?`<p class="cgp-sum">${esc(p.summary)}</p>`:''}
      <div class="cgp-actions">
        ${href?`<a class="cgp-go" href="${esc(href)}"${/^https:/i.test(href)?' target="_blank" rel="noopener"':''}>${esc(p.apply_label||'자세히 보기')} →</a>`:''}
        ${admin&&p.manage_url?`<a class="cgp-manage" href="${esc(safeHref(p.manage_url))}">신청현황 관리</a>`:''}
        ${admin?`<button type="button" class="cgp-edit" data-edit="${esc(p.id)}">수정</button>`:''}
      </div>
    </div>
  </article>`;
}
function expireStatic(){
  const today=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
  document.querySelectorAll('[data-expires]').forEach(el=>{if(el.dataset.expires&&today>el.dataset.expires)el.hidden=true});
}

/* ---------- 홈: 지금 참여할 수 있는 활동 ---------- */
async function homeStrip(el){
  let list;
  try{list=await rpc('cgma_programs_public');}catch(e){console.warn('[cgma-programs] public list unavailable; static fallback kept',e?.code||e);return}
  if(!Array.isArray(list))return;
  const now=list.filter(p=>p.status==='모집중'||p.status==='준비').slice(0,3);
  const grid=el.querySelector('[data-programs-grid]');
  if(!grid)return;
  grid.innerHTML=now.length?now.map(p=>card(p)).join(''):'<p class="cgp-empty">지금 모집 중인 활동이 없습니다. 지난 활동과 결과는 전체 보기에서 확인하세요.</p>';
  el.dataset.state='live';
  if(await isAdmin()){
    const head=el.querySelector('.cgp-head');
    if(head&&!head.querySelector('.cgp-admin-link')){
      const a=document.createElement('a');a.className='cgp-admin-link';a.href=route('/programs/#manage');a.textContent='＋ 행사·활동 등록·관리';
      head.append(a);
    }
  }
}

/* ---------- /programs/ 허브 ---------- */
const FIELDS=[
  ['title','제목','text',{required:true,maxlength:80}],
  ['category','분류','select',{options:CATEGORIES}],
  ['status','상태','select',{options:['준비','모집중','마감','종료']}],
  ['period_label','기간 표시','text',{maxlength:60,placeholder:'예: 11.6(금) – 12.18(금) · 매주 2시간'}],
  ['starts_on','시작일','date',{}],
  ['ends_on','종료일','date',{}],
  ['summary','소개 (300자 이내)','textarea',{maxlength:300}],
  ['apply_url','신청·안내 주소','text',{placeholder:'/programs/... 또는 https://...'}],
  ['apply_label','버튼 문구','text',{maxlength:30,placeholder:'예: 참가 신청'}],
  ['manage_url','신청현황 관리 주소 (관리자만 보임)','text',{placeholder:'/programs/.../#manage'}],
  ['image_url','대표 이미지 주소 (선택)','text',{placeholder:'/festival/... 또는 https://...'}],
  ['sort_order','정렬 순서 (작을수록 앞)','number',{min:0,max:9999}],
  ['is_public','홈페이지에 공개','checkbox',{}]
];
function editorHtml(){
  return `<form class="cgp-editor" id="cgpEditor" hidden novalidate>
    <div class="cgp-editor-head"><strong id="cgpEditorTitle">새 행사·활동 등록</strong><button type="button" class="cgp-x" data-close>닫기</button></div>
    <input type="hidden" name="id">
    <div class="cgp-editor-grid">${FIELDS.map(([n,l,t,o])=>{
      const id='cgp-f-'+n;
      if(t==='select')return `<label for="${id}">${l}<select id="${id}" name="${n}">${o.options.map(x=>`<option>${x}</option>`).join('')}</select></label>`;
      if(t==='textarea')return `<label for="${id}" class="wide">${l}<textarea id="${id}" name="${n}" rows="3" maxlength="${o.maxlength}"></textarea></label>`;
      if(t==='checkbox')return `<label for="${id}" class="cgp-check"><input type="checkbox" id="${id}" name="${n}" checked> ${l}</label>`;
      return `<label for="${id}">${l}<input id="${id}" name="${n}" type="${t}"${o.maxlength?` maxlength="${o.maxlength}"`:''}${o.placeholder?` placeholder="${esc(o.placeholder)}"`:''}${o.min!=null?` min="${o.min}" max="${o.max}"`:''}${o.required?' required':''}></label>`;
    }).join('')}</div>
    <p class="cgp-msg" id="cgpMsg" role="status"></p>
    <div class="cgp-editor-actions"><button type="submit" class="cgp-save">저장</button><button type="button" data-close>취소</button></div>
  </form>`;
}
async function hub(el){
  const lists={now:el.querySelector('[data-group="now"]'),soon:el.querySelector('[data-group="soon"]'),past:el.querySelector('[data-group="past"]')};
  let admin=false,rows=[];
  async function load(){
    try{
      if(admin){const r=await rpc('cgma_programs_admin_list',{}, {auth:true});if(r?.ok)rows=r.rows;else throw new Error(r?.error)}
      else rows=await rpc('cgma_programs_public');
    }catch(e){
      el.querySelector('[data-programs-error]').hidden=false;
      console.warn('[cgma-programs] list unavailable',e?.code||e);return;
    }
    el.querySelector('[data-programs-error]').hidden=true;
    const pick=s=>rows.filter(p=>s.includes(p.status)).sort((a,b)=>(STATUS_ORDER[a.status]-STATUS_ORDER[b.status])||(a.sort_order-b.sort_order));
    const fill=(node,items,empty)=>{if(node)node.innerHTML=items.length?items.map(p=>card(p,{admin})).join(''):`<p class="cgp-empty">${empty}</p>`};
    fill(lists.now,pick(['모집중']),'지금 모집 중인 활동이 없습니다.');
    fill(lists.soon,pick(['준비']),'예정된 활동이 곧 안내됩니다.');
    fill(lists.past,pick(['마감','종료']),'지난 활동이 없습니다.');
  }
  await load();
  admin=await isAdmin();
  const bar=el.querySelector('[data-admin-bar]');
  if(!admin){
    if(location.hash==='#manage'&&bar){
      bar.hidden=false;
      bar.innerHTML=`<p>행사·활동 등록은 상인회 관리자 계정으로 로그인하면 이 화면에서 바로 할 수 있습니다.</p><a class="cgp-go" href="${esc(loginUrl())}">Google로 로그인 →</a>`;
    }
    return;
  }
  document.documentElement.classList.add('cgma-can-manage');
  bar.hidden=false;
  bar.innerHTML=`<p><b>관리자 모드</b> · 비공개 항목까지 보입니다. 변경 내용은 누가·언제 바꿨는지 기록됩니다.</p><button type="button" class="cgp-add" id="cgpAdd">＋ 새 행사·활동 등록</button>`;
  bar.insertAdjacentHTML('afterend',editorHtml());
  const form=el.querySelector('#cgpEditor'),msg=el.querySelector('#cgpMsg');
  const openEditor=item=>{
    form.reset();form.elements.id.value=item?.id||'';
    el.querySelector('#cgpEditorTitle').textContent=item?'행사·활동 수정':'새 행사·활동 등록';
    FIELDS.forEach(([n,,t])=>{const f=form.elements[n];if(!f)return;
      if(t==='checkbox')f.checked=item?item[n]!==false:true;
      else if(item&&item[n]!=null)f.value=item[n];
      else if(n==='sort_order')f.value=100;
    });
    msg.textContent='';form.hidden=false;form.elements.title.focus();form.scrollIntoView({block:'start',behavior:'smooth'});
  };
  el.querySelector('#cgpAdd').addEventListener('click',()=>openEditor(null));
  form.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>{form.hidden=true}));
  el.addEventListener('click',ev=>{const b=ev.target.closest('[data-edit]');if(!b)return;openEditor(rows.find(r=>r.id===b.dataset.edit))});
  form.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const p={};FIELDS.forEach(([n,,t])=>{const f=form.elements[n];p[n]=t==='checkbox'?f.checked:f.value.trim()});
    if(form.elements.id.value)p.id=form.elements.id.value;
    if(p.title.length<2){msg.textContent='제목을 2자 이상 적어 주세요.';form.elements.title.focus();return}
    for(const k of ['apply_url','manage_url','image_url'])if(p[k]&&!/^(\/|https:\/\/)/.test(p[k])){msg.textContent='주소는 /로 시작하거나 https://로 시작해야 합니다.';form.elements[k].focus();return}
    if(p.starts_on&&p.ends_on&&p.ends_on<p.starts_on){msg.textContent='종료일이 시작일보다 빠릅니다.';return}
    const btn=form.querySelector('.cgp-save');btn.disabled=true;msg.textContent='저장 중…';
    try{
      const r=await rpc('cgma_programs_admin_save',{p},{auth:true});
      if(!r?.ok)throw Object.assign(new Error(r?.error),{code:r?.error});
      msg.textContent='저장했습니다.';form.hidden=true;await load();
    }catch(e){
      msg.textContent=({tenant_admin_required:'관리자 권한이 확인되지 않았습니다. 다시 로그인해 주세요.',login_required:'로그인이 만료되었습니다. 다시 로그인해 주세요.',invalid:'입력값을 확인해 주세요(날짜·주소 형식).',duplicate_slug:'같은 이름의 항목이 이미 있습니다.'})[e.code]||'저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }finally{btn.disabled=false}
  });
  await load();
  if(location.hash==='#manage')bar.scrollIntoView({block:'start'});
}

window.CGMA_PROGRAMS=Object.freeze({rpc,token,isAdmin,loginUrl,whenAuthReady:()=>authReady,authError:()=>authReturnError,route,esc});
function boot(){
  expireStatic();
  const strip=document.getElementById('cgmaProgramsStrip');if(strip)homeStrip(strip);
  const h=document.getElementById('programsHub');if(h)hub(h);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
