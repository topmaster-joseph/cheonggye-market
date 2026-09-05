import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const CORE=`${SUPABASE_URL}/functions/v1/core-api`;
const MEMBERSHIP=`${SUPABASE_URL}/functions/v1/membership-api`;
const ACCESS=`${SUPABASE_URL}/functions/v1/access-api`;
const TENANT='cheonggye';
const SITE='cgma';
const route=value=>window.CGMA_ROUTE?.route(value)||value;
const absolute=value=>window.CGMA_ROUTE?.absolute(value)||new URL(route(value),location.origin).toString();
const AUTH_REDIRECT=absolute('/member?apply=1');
const AUTH_HUB=`https://auth.ekodi.kr/?site=${encodeURIComponent(SITE)}&return_to=${encodeURIComponent(AUTH_REDIRECT)}`;
const MARKETING_RETURN='https://marketing.ekodi.kr/';
const sb=createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{detectSessionInUrl:true,persistSession:true}});

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let stores=[];let selectedStore=null;let activeApprovedStore=null;let activeApprovedStoreName='';

function show(id,on=true){const el=$(id);if(el)el.classList.toggle('hide',!on)}
function status(id,text,type=''){const el=$(id);if(!el)return;el.textContent=text;el.className=`status${type?` ${type}`:''}`;el.classList.remove('hide')}
function hideStatus(id){const el=$(id);if(el)el.classList.add('hide')}
function setStage(stage){document.querySelectorAll('.progress-item').forEach(item=>{const n=Number(item.dataset.stage);item.classList.toggle('active',n===stage);item.classList.toggle('done',n<stage);item.setAttribute('aria-current',n===stage?'step':'false')});const label={1:'Google 무료 로그인',2:'정회원 신청',3:'승인 확인',4:'가게·AI 연결'};const current=$('progressCurrent');if(current)current.textContent=`현재 ${stage}단계 · ${label[stage]}`;}
async function session(){const {data}=await sb.auth.getSession();return data.session}
async function api(base,path,options={}){const s=await session();if(!s)throw new Error('login_required');const headers={apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${s.access_token}`,...(options.headers||{})};if(options.body&&!headers['content-type'])headers['content-type']='application/json';const r=await fetch(`${base}${path}`,{...options,headers,cache:'no-store'});const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}}if(!r.ok){const e=new Error(data.error||`http_${r.status}`);e.data=data;e.status=r.status;throw e}return data;}

async function consumeCentralHandoff(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const tokenHash=hash.get('ekodi_token');
  if(!tokenHash)return false;
  const type=hash.get('ekodi_type')||'email';
  history.replaceState({},document.title,location.pathname+location.search);
  try{
    const {error}=await sb.auth.verifyOtp({token_hash:tokenHash,type});
    if(error)throw error;
    return true;
  }catch(e){
    console.error('EKODI central handoff',e);
    status('loginStatus','통합인증 연결이 만료되었거나 이미 사용되었습니다. 다시 로그인해 주세요.','error');
    return false;
  }
}

function openAuthHub(){
  status('loginStatus','Google 무료 로그인을 위해 EKODI 통합인증센터로 이동합니다.');
  location.assign(AUTH_HUB);
}
function marketingWorkspaceUrl(storeId){
  const id=String(storeId||'').trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))return '';
  const target=new URL('https://auth.ekodi.kr/');
  target.searchParams.set('site','marketing');
  target.searchParams.set('workspace',`store:${id.toLowerCase()}`);
  target.searchParams.set('return_to',MARKETING_RETURN);
  return target.href;
}
function setMarketingStore(storeId,storeName=''){
  activeApprovedStore=storeId||null;
  activeApprovedStoreName=storeName||'승인된 내 점포';
  if($('marketingStoreName'))$('marketingStoreName').textContent=activeApprovedStoreName;
  if(activeApprovedStore){show('serviceCard',true);setStage(4);}
}

async function loadSiteAccess(){return api(ACCESS,`/me?site=${encodeURIComponent(SITE)}`)}
async function updateAdminEntry(s){
  show('memberAdminEntry',false);
  if(!s)return false;
  try{
    const response=await fetch(route('/api/admin-session'),{headers:{Authorization:`Bearer ${s.access_token}`},cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    const allowed=response.ok&&result.allowed===true;
    show('memberAdminEntry',allowed);
    return allowed;
  }catch{return false;}
}
function storeRegistryState(){return document.querySelector('input[name="storeRegistryState"]:checked')?.value||'existing';}
function applicationData(){
  return {
    storeRegistryState:storeRegistryState(),
    applicantName:$('applicantName').value.trim(),
    applicantPhone:$('applicantPhone').value.trim(),
    storeName:$('storeNameApply').value.trim(),
    businessType:$('businessType').value.trim(),
    storeAddress:$('storeAddressApply').value.trim(),
    businessNumber:$('businessNumber').value.trim(),
    applicantRole:$('applicantRole').value,
    openedAt:$('openedAt').value,
    note:$('accessNote').value.trim()
  };
}
function validateApplication(d){
  if(!d.applicantName||!d.applicantPhone||!d.storeName||!d.businessType||!d.storeAddress||!d.businessNumber||!d.applicantRole)return '필수 항목을 모두 입력해 주세요.';
  const phoneDigits=d.applicantPhone.replace(/\D/g,'');
  if(phoneDigits.length<10||phoneDigits.length>11)return '연락처를 정확히 입력해 주세요.';
  if(d.businessNumber.replace(/\D/g,'').length!==10)return '사업자등록번호 10자리를 확인해 주세요.';
  if(!$('membershipConsent').checked)return '개인정보 수집·이용과 정관·회비 안내 확인에 동의해 주세요.';
  return '';
}
function buildApplicationNote(d){
  return [
    '[청계면상인회 정회원 신청]',
    `점포 명단 상태: ${d.storeRegistryState==='new'?'명단에 없는 신규 점포':'기존 상가 명단 점포'}`,
    `신청자 성명: ${d.applicantName}`,
    `연락처: ${d.applicantPhone}`,
    `운영 상가명: ${d.storeName}`,
    `업종: ${d.businessType}`,
    `상가 주소: ${d.storeAddress}`,
    `사업자등록번호: ${d.businessNumber}`,
    `신청자 역할: ${d.applicantRole}`,
    `영업 시작일: ${d.openedAt||'미입력'}`,
    `건의·확인 메모: ${d.note||'없음'}`,
    '개인정보·정관·회비 안내 확인: 동의'
  ].join('\n');
}
async function requestSiteAccess(){
  const button=$('requestAccess');
  const d=applicationData();
  const errorMessage=validateApplication(d);
  if(errorMessage)return status('accessRequestStatus',errorMessage,'warn');
  button.disabled=true;
  try{
    const note=buildApplicationNote(d);
    const result=await api(ACCESS,'/request',{method:'POST',body:JSON.stringify({site:SITE,tenant:TENANT,role:'member',note})});
    if(result.already_authorized){status('accessRequestStatus','이미 정회원 권한이 확인되었습니다. 화면을 다시 불러옵니다.');setTimeout(()=>location.reload(),500);return;}
    const submittedNewStore=d.storeRegistryState==='new';
    status('accessRequestStatus',result.already_pending?'이미 정회원 신청이 접수되어 검수 중입니다.':submittedNewStore?'정회원 신청과 신규 점포 정보가 함께 접수되었습니다. 임원 검수 후 점포 등록과 정회원 권한 연결을 진행합니다.':'정회원 신청이 접수되었습니다. 임원 검수 후 이 Google 계정에 정회원 권한이 자동 연결됩니다.');
    setStage(3);
  }catch(e){status('accessRequestStatus',e.message==='unauthorized'?'Google 로그인을 다시 확인해 주세요.':'정회원 신청을 처리하지 못했습니다.','error')}
  finally{button.disabled=false}
}

async function loadStores(){const r=await fetch(`${CORE}/public/stores?tenant=${TENANT}`,{cache:'no-store'});if(!r.ok)throw new Error('stores_failed');const d=await r.json();stores=d.stores||[];renderStores();}
function renderStores(){const q=$('storeSearch').value.trim().toLowerCase();const list=stores.filter(s=>!q||`${s.name} ${s.public_address||''}`.toLowerCase().includes(q));$('storeList').innerHTML=list.map(s=>`<button class="store ${selectedStore?.id===s.id?'active':''}" data-id="${esc(s.id)}"><b>${esc(s.name)}</b><small>${esc(s.public_address||'주소 확인 중')}</small></button>`).join('')||'<div class="status warn">검색 결과가 없습니다. 명단에 없던 신규 점포로 신청했다면 관리자 등록이 완료된 뒤 이 목록에 나타납니다.</div>';$('storeList').querySelectorAll('.store').forEach(b=>b.onclick=()=>{selectedStore=stores.find(s=>s.id===b.dataset.id);$('claimStore').disabled=!selectedStore;renderStores();hideStatus('claimStatus');});}

async function loadClaims(){
  const d=await api(MEMBERSHIP,'/mine');
  const claims=d.claims||[];
  if(d.profile){$('displayName').value=d.profile.display_name||'';$('phone').value=d.profile.phone||'';}
  show('claimsCard',true);
  const label={pending:'점포 연결 대기',approved:'점포 연결 완료',rejected:'반려',withdrawn:'철회'};
  $('claims').innerHTML=claims.length?claims.map(c=>`<div class="claim"><div class="row claim-head"><b>${esc(c.store?.name||'점포')}</b><span class="badge ${esc(c.status)}">${label[c.status]||esc(c.status)}</span></div><p class="subtle">${esc(c.store?.slug||'')} · ${new Date(c.requested_at).toLocaleDateString('ko-KR')}</p>${c.admin_note?`<p class="subtle">확인 메모: ${esc(c.admin_note)}</p>`:''}${c.status==='approved'?`<button class="ghost connect" data-store="${esc(c.store_id)}">이 가게 AI 혜택 보기</button>`:''}${c.status==='pending'?`<button class="secondary withdraw" data-id="${esc(c.id)}">신청 철회</button>`:''}</div>`).join(''):'<div class="status">정회원 승인이 완료되었습니다. 아래에서 내 가게를 선택해 연결해 주세요.</div>';
  $('claims').querySelectorAll('.connect').forEach(b=>b.onclick=()=>{
    const claim=claims.find(c=>String(c.store_id)===String(b.dataset.store));
    setMarketingStore(b.dataset.store,claim?.store?.name||'승인된 내 점포');
    $('serviceCard').scrollIntoView({behavior:'smooth',block:'start'});
    hideStatus('serviceStatus');
  });
  $('claims').querySelectorAll('.withdraw').forEach(b=>b.onclick=async()=>{try{await api(MEMBERSHIP,'/withdraw',{method:'POST',body:JSON.stringify({claim_id:b.dataset.id})});await loadClaims()}catch{status('claimStatus','철회 처리에 실패했습니다.','error')}});
  const firstApproved=claims.find(c=>c.status==='approved');
  if(firstApproved&&!activeApprovedStore)setMarketingStore(firstApproved.store_id,firstApproved.store?.name||'승인된 내 점포');
  if(firstApproved)show('serviceCard',true);
  setStage(4);
}

async function authorizedUI(){show('accessCard',false);show('storeCard',true);setStage(4);try{await Promise.all([loadStores(),loadClaims()])}catch{status('claimStatus','회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.','error')}}
function unregisteredUI(s,access={}){show('storeCard',false);show('claimsCard',false);show('serviceCard',false);show('accessCard',true);$('accessEmail').textContent=s.user.email||'Google 로그인 계정';const pending=access.status==='pending';$('accessCopy').textContent=pending?'정회원 신청이 접수되어 임원 검수 중입니다.':'무료 로그인은 완료되었습니다. 정회원 심사에 필요한 정보만 추가로 입력해 주세요.';if(pending){status('accessRequestStatus','정회원 신청이 이미 접수되어 검수 중입니다. 승인되면 같은 Google 계정으로 바로 이용할 수 있습니다.');$('requestAccess').disabled=true;setStage(3)}else{setStage(2)}}

async function signedInUI(s){
  show('loginCard',false);show('accountCard',true);$('accountEmail').textContent=s.user.email||s.user.user_metadata?.full_name||'Google 계정';
  await updateAdminEntry(s);
  if(!$('applicantName').value)$('applicantName').value=s.user.user_metadata?.full_name||s.user.user_metadata?.name||'';
  if(!$('applicantPhone').value&&s.user.phone)$('applicantPhone').value=s.user.phone;
  try{
    const access=await loadSiteAccess();
    if(access.status==='active'||access.status==='pre_registered')await authorizedUI();
    else unregisteredUI(s,access);
  }catch{show('accessCard',true);show('storeCard',false);status('accessRequestStatus','정회원 권한 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.','error');setStage(2)}
}
async function signedOutUI(){show('memberAdminEntry',false);show('loginCard',true);show('accountCard',false);show('accessCard',false);show('storeCard',false);show('claimsCard',false);show('serviceCard',false);setStage(1);}

$('googleLogin').onclick=openAuthHub;
$('requestAccess').onclick=requestSiteAccess;
$('logout').onclick=async()=>{await sb.auth.signOut();await signedOutUI()};
document.querySelectorAll('input[name="storeRegistryState"]').forEach(input=>input.addEventListener('change',()=>{const isNew=storeRegistryState()==='new';show('newStoreHint',isNew);$('storeNameApply').placeholder=isNew?'신규 상호명 직접 입력':'상호명';$('storeAddressApply').placeholder=isNew?'신규 점포의 무안군 청계면 이하 주소':'무안군 청계면 이하 주소';}));
$('storeSearch').addEventListener('input',renderStores);
$('claimStore').onclick=async()=>{if(!selectedStore)return;const displayName=$('displayName').value.trim(),phone=$('phone').value.trim();if(!displayName||!phone)return status('claimStatus','점포 연결 확인을 위해 이름과 연락처를 입력해 주세요.','warn');$('claimStore').disabled=true;try{const d=await api(MEMBERSHIP,'/claim',{method:'POST',body:JSON.stringify({store_id:selectedStore.id,display_name:displayName,phone,note:$('claimNote').value.trim()})});status('claimStatus',d.already_pending?'이미 점포 연결 승인 대기 중입니다.':'점포 연결 신청을 접수했습니다.');setStage(4);await loadClaims()}catch(e){status('claimStatus',e.message==='already_store_member'?'이미 연결된 점포입니다.':e.message==='name_phone_required'?'이름과 연락처를 입력해 주세요.':'신청을 처리하지 못했습니다.','error')}finally{$('claimStore').disabled=false}};
$('activateService').onclick=()=>{
  if(!activeApprovedStore)return status('serviceStatus','승인된 점포를 먼저 선택해 주세요.','warn');
  const target=marketingWorkspaceUrl(activeApprovedStore);
  if(!target)return status('serviceStatus','점포 식별정보를 확인하지 못했습니다. 다시 로그인해 주세요.','error');
  status('serviceStatus',`${activeApprovedStoreName||'승인된 점포'}의 Marketing AI Basic 공간으로 안전하게 이동합니다.`);
  location.assign(target);
};

setStage(1);
await consumeCentralHandoff();
const {data:{session:initial}}=await sb.auth.getSession();if(initial)await signedInUI(initial);else await signedOutUI();
sb.auth.onAuthStateChange(async(event,s)=>{if(event==='SIGNED_IN'&&s)await signedInUI(s);if(event==='SIGNED_OUT')await signedOutUI()});
