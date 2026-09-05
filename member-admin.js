import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const MEMBERSHIP=`${SUPABASE_URL}/functions/v1/membership-api`;
const ACCESS=`${SUPABASE_URL}/functions/v1/access-api`;
const TENANT='cheonggye',SITE='cgma';
const sb=createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true}});
const route=value=>window.CGMA_ROUTE?.route(value)||value;
const absolute=value=>window.CGMA_ROUTE?.absolute(value)||new URL(route(value),location.origin).toString();
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function show(id,on=true){$(id)?.classList.toggle('hide',!on)}
function setStatus(text,type=''){const el=$('status');if(!el)return;el.textContent=text;el.className=`status${type?` ${type}`:''}`}
async function session(){const {data}=await sb.auth.getSession();return data.session}
async function api(base,path,options={}){
  const s=await session();if(!s)throw new Error('login_required');
  const headers={apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${s.access_token}`,...(options.headers||{})};
  if(options.body)headers['content-type']='application/json';
  const response=await fetch(`${base}${path}`,{...options,headers}),data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(data.error||`http_${response.status}`);error.status=response.status;throw error}return data;
}
const noteField=(note,label)=>String(note||'').split('\n').find(line=>line.startsWith(`${label}:`))?.slice(label.length+1).trim()||'';
const normalized=value=>String(value||'').replace(/\s+/g,'').toLowerCase();
function merchantCategory(industry){const value=String(industry||'');if(/카페|커피|디저트|베이커리|제과/.test(value))return 'cafe';if(/음식|한식|중식|일식|분식|치킨|피자|주점|국밥|돈가스|라멘|도시락|햄버거|부리또|찐빵|도너츠/.test(value))return 'food';if(/미용|문화|서비스|인쇄|사진|게임|당구|교육|디자인|행정/.test(value))return 'culture';return 'life'}
async function syncApprovedMerchant(row){const s=await session();if(!s)throw new Error('login_required');const auth={Authorization:`Bearer ${s.access_token}`};const listResponse=await fetch(route('/api/merchants?include_hidden=1'),{headers:auth,cache:'no-store'}),listData=await listResponse.json();if(!listResponse.ok)throw new Error(listData.error||'merchant_load_failed');const name=row.business_name||noteField(row.applicant_note,'운영 상가명')||'신규 점포',address=noteField(row.applicant_note,'상가 주소'),industry=noteField(row.applicant_note,'업종'),phone=row.contact_phone||noteField(row.applicant_note,'연락처');const existing=(listData.items||[]).find(item=>normalized(item.name)===normalized(name)&&(address?normalized(item.address)===normalized(address)||!item.address:true));const payload={id:existing?.id,name,category:existing?.category||merchantCategory(industry),industry:industry||existing?.industry||'',address:address||existing?.address||'',phone:phone||existing?.phone||'',membership:'regular',visible:true,sort_order:existing?.sort_order||100};const response=await fetch(route('/api/merchants'),{method:existing?'PUT':'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify(payload)}),data=await response.json();if(!response.ok)throw new Error(data.error||'merchant_sync_failed');return data;}

function renderAccess(requests){
  const root=$('accessPending');if(!root)return;$('accessCount').textContent=`${requests.length}건`;
  if(!requests.length){root.innerHTML='<div class="status">신규 정회원 승인 대기가 없습니다.</div>';return}
  root.innerHTML=requests.map(row=>{
    const store=row.business_name||noteField(row.applicant_note,'운영 상가명')||'신규 점포';
    const address=noteField(row.applicant_note,'상가 주소');
    const phone=row.contact_phone||noteField(row.applicant_note,'연락처');
    const business=row.business_number||noteField(row.applicant_note,'사업자등록번호');
    const type=noteField(row.applicant_note,'업종');
    return `<article class="claim-card" data-access-id="${esc(row.id)}"><span class="badge pending">신규 정회원</span><h2 style="margin-top:10px">${esc(store)}</h2><p>${esc(type)}${type&&address?' · ':''}${esc(address)}</p><p><b>신청 계정</b> ${esc(row.email||'')}</p><p><b>연락처</b> ${esc(phone||'미입력')} · <b>사업자번호</b> ${esc(business||'미입력')}</p><label>관리 메모 <span class="subtle">선택</span></label><textarea class="review-note" placeholder="확인 메모"></textarea><div class="row"><button class="approve">정회원 승인</button><button class="danger reject">반려</button></div></article>`;
  }).join('');
  root.querySelectorAll('[data-access-id]').forEach(card=>{
    const review=async decision=>{
      const buttons=card.querySelectorAll('button');buttons.forEach(button=>button.disabled=true);
      try{
        const row=requests.find(item=>String(item.id)===String(card.dataset.accessId));
        await api(ACCESS,'/review',{method:'POST',body:JSON.stringify({request_id:card.dataset.accessId,decision,admin_note:card.querySelector('.review-note').value.trim()})});
        let syncWarning=false;if(decision==='approve'&&row){try{await syncApprovedMerchant(row)}catch(error){console.error('CGMA approved merchant sync',error);syncWarning=true}}
        await loadPending();if(syncWarning)setStatus('정회원 승인은 완료했지만 점포명부 자동 반영에 실패했습니다. 운영관리의 점포·회원 명부에서 확인해 주세요.','warn');
      }catch(error){setStatus(error.message==='reviewer_required'?'신규 정회원 승인 권한이 없습니다.':'신규 정회원 처리를 완료하지 못했습니다.','error')}
      finally{buttons.forEach(button=>button.disabled=false)}
    };
    card.querySelector('.approve').onclick=()=>review('approve');
    card.querySelector('.reject').onclick=()=>review('reject');
  });
}
function renderClaims(claims){
  const root=$('claimPending');if(!root)return;$('claimCount').textContent=`${claims.length}건`;
  if(!claims.length){root.innerHTML='<div class="status">기존 점포 연결 승인 대기가 없습니다.</div>';return}
  root.innerHTML=claims.map(row=>`<article class="claim-card" data-claim-id="${esc(row.id)}"><span class="badge pending">기존 점포 연결</span><h2 style="margin-top:10px">${esc(row.store?.name||'점포')}</h2><p>${esc(row.store?.public_address||'')}</p><p><b>신청자</b> ${esc(row.applicant?.display_name||'이름 미확인')} · ${esc(row.applicant?.phone||'연락처 미확인')}</p>${row.applicant_note?`<p><b>신청 메모</b> ${esc(row.applicant_note)}</p>`:''}<label>관리 메모 <span class="subtle">선택</span></label><textarea class="review-note" placeholder="확인 메모"></textarea><div class="row"><button class="approve">점포 연결 승인</button><button class="danger reject">반려</button></div></article>`).join('');
  root.querySelectorAll('[data-claim-id]').forEach(card=>{
    const review=async decision=>{
      const buttons=card.querySelectorAll('button');buttons.forEach(button=>button.disabled=true);
      try{
        await api(MEMBERSHIP,'/review',{method:'POST',body:JSON.stringify({claim_id:card.dataset.claimId,decision,admin_note:card.querySelector('.review-note').value.trim()})});
        await loadPending();
      }catch(error){setStatus(error.message==='tenant_admin_required'?'점포 연결 승인 권한이 없습니다.':'점포 연결 처리를 완료하지 못했습니다.','error')}
      finally{buttons.forEach(button=>button.disabled=false)}
    };
    card.querySelector('.approve').onclick=()=>review('approve');card.querySelector('.reject').onclick=()=>review('reject');
  });
}
async function loadPending(){
  show('pendingCard',true);setStatus('신규 정회원과 점포 연결 신청을 확인하고 있습니다.');
  const [accessResult,claimResult]=await Promise.allSettled([
    api(ACCESS,`/pending?site=${SITE}&tenant=${TENANT}`),
    api(MEMBERSHIP,`/pending?tenant=${TENANT}`)
  ]);
  const requests=accessResult.status==='fulfilled'?(accessResult.value.requests||[]):[];
  const claims=claimResult.status==='fulfilled'?(claimResult.value.claims||[]):[];
  const reviewer=claimResult.status==='fulfilled'?claimResult.value.reviewer:null;
  if($('authorityLabel'))$('authorityLabel').textContent=reviewer?.authority==='platform'?'PLATFORM ADMIN · DELEGATED':'TENANT ADMIN';
  renderAccess(requests);renderClaims(claims);$('count').textContent=`${requests.length+claims.length}건`;
  if(accessResult.status==='rejected'&&claimResult.status==='rejected')return setStatus('승인 대기 목록을 불러오지 못했습니다. 관리자 권한을 확인해 주세요.','error');
  if(accessResult.status==='rejected')return setStatus('기존 점포 연결 목록은 확인했지만 신규 정회원 신청 목록은 불러오지 못했습니다.','warn');
  if(claimResult.status==='rejected')return setStatus('신규 정회원 신청 목록은 확인했지만 기존 점포 연결 목록은 불러오지 못했습니다.','warn');
  setStatus(requests.length+claims.length?'신청 내용을 확인한 뒤 필요한 승인만 처리하세요.':'현재 승인 대기 신청이 없습니다.');
}

async function signedInUI(s){show('loginCard',false);show('accountCard',true);$('accountEmail').textContent=s.user.email||'관리자 계정';await loadPending()}
async function signedOutUI(){show('loginCard',true);show('accountCard',false);show('pendingCard',false)}
$('sendLink').onclick=async()=>{const email=$('email').value.trim();if(!email)return;try{const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:absolute('/member-admin'),shouldCreateUser:true}});if(error)throw error;const el=$('loginStatus');el.textContent='로그인 링크를 보냈습니다.';el.className='status'}catch{const el=$('loginStatus');el.textContent='로그인 링크를 보내지 못했습니다.';el.className='status error'}};
$('logout').onclick=async()=>{await sb.auth.signOut();await signedOutUI()};$('refresh').onclick=loadPending;
const {data:{session:initial}}=await sb.auth.getSession();if(initial)await signedInUI(initial);else await signedOutUI();
sb.auth.onAuthStateChange(async(event,s)=>{if(event==='SIGNED_IN'&&s)await signedInUI(s);if(event==='SIGNED_OUT')await signedOutUI()});
