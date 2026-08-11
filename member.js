import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const CORE=`${SUPABASE_URL}/functions/v1/core-api`;
const MEMBERSHIP=`${SUPABASE_URL}/functions/v1/membership-api`;
const ONBOARDING=`${SUPABASE_URL}/functions/v1/onboarding-api`;
const KNOWLEDGE=`${SUPABASE_URL}/functions/v1/knowledge-api`;
const TENANT='cheonggye';
const sb=createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true}});

const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let stores=[];let selectedStore=null;let activeApprovedStore=null;
function show(id,on=true){$(id).classList.toggle('hide',!on)}
function status(id,text,type=''){const el=$(id);el.textContent=text;el.className=`status${type?` ${type}`:''}`;el.classList.remove('hide')}
function hideStatus(id){$(id).classList.add('hide')}
async function session(){const {data}=await sb.auth.getSession();return data.session}
async function api(base,path,options={}){const s=await session();if(!s)throw new Error('login_required');const headers={apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${s.access_token}`,...(options.headers||{})};if(options.body&&!headers['content-type'])headers['content-type']='application/json';const r=await fetch(`${base}${path}`,{...options,headers});const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{data={raw:text}}if(!r.ok){const e=new Error(data.error||`http_${r.status}`);e.data=data;e.status=r.status;throw e}return data;}
async function oauth(provider){status('loginStatus',`${provider==='google'?'Google':'Kakao'} 로그인 화면으로 이동합니다.`);const {error}=await sb.auth.signInWithOAuth({provider,options:{redirectTo:`${location.origin}/member`}});if(error)status('loginStatus','로그인 제공자 또는 Redirect 설정을 확인해 주세요.','error');}

async function loadStores(){const r=await fetch(`${CORE}/public/stores?tenant=${TENANT}`);if(!r.ok)throw new Error('stores_failed');const d=await r.json();stores=d.stores||[];renderStores();}
function renderStores(){const q=$('storeSearch').value.trim().toLowerCase();const list=stores.filter(s=>!q||`${s.name} ${s.public_address||''}`.toLowerCase().includes(q));$('storeList').innerHTML=list.map(s=>`<button class="store ${selectedStore?.id===s.id?'active':''}" data-id="${esc(s.id)}"><b>${esc(s.name)}</b><small>${esc(s.public_address||'주소 확인 중')}</small></button>`).join('')||'<div class="status warn">검색 결과가 없습니다.</div>';$('storeList').querySelectorAll('.store').forEach(b=>b.onclick=()=>{selectedStore=stores.find(s=>s.id===b.dataset.id);$('claimStore').disabled=!selectedStore;renderStores();hideStatus('claimStatus');});}

async function loadClaims(){const d=await api(MEMBERSHIP,'/mine');const claims=d.claims||[];if(d.profile){$('displayName').value=d.profile.display_name||'';$('phone').value=d.profile.phone||'';}show('claimsCard',true);const label={pending:'승인 대기',approved:'승인 완료',rejected:'반려',withdrawn:'철회'};$('claims').innerHTML=claims.length?claims.map(c=>`<div class="claim"><div class="row" style="justify-content:space-between"><b>${esc(c.store?.name||'점포')}</b><span class="badge ${esc(c.status)}">${label[c.status]||esc(c.status)}</span></div><p class="subtle">${esc(c.store?.slug||'')} · ${new Date(c.requested_at).toLocaleDateString('ko-KR')}</p>${c.admin_note?`<p class="subtle">확인 메모: ${esc(c.admin_note)}</p>`:''}${c.status==='approved'?`<button class="ghost connect" data-store="${esc(c.store_id)}">이 가게 AI 연결</button>`:''}${c.status==='pending'?`<button class="secondary withdraw" data-id="${esc(c.id)}">신청 철회</button>`:''}</div>`).join(''):'<div class="status">아직 점포 확인 신청이 없습니다.</div>';$('claims').querySelectorAll('.connect').forEach(b=>b.onclick=()=>{activeApprovedStore=b.dataset.store;show('serviceCard',true);$('serviceCard').scrollIntoView({behavior:'smooth',block:'start'});hideStatus('serviceStatus');});$('claims').querySelectorAll('.withdraw').forEach(b=>b.onclick=async()=>{try{await api(MEMBERSHIP,'/withdraw',{method:'POST',body:JSON.stringify({claim_id:b.dataset.id})});await loadClaims()}catch{status('claimStatus','철회 처리에 실패했습니다.','error')}});const firstApproved=claims.find(c=>c.status==='approved');if(firstApproved&&!activeApprovedStore)activeApprovedStore=firstApproved.store_id;if(firstApproved)show('serviceCard',true);}

async function signedInUI(s){show('loginCard',false);show('accountCard',true);show('storeCard',true);$('accountEmail').textContent=s.user.email||s.user.user_metadata?.full_name||'정회원 계정';try{await Promise.all([loadStores(),loadClaims()])}catch{status('claimStatus','회원 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.','error')}}
async function signedOutUI(){show('loginCard',true);show('accountCard',false);show('storeCard',false);show('claimsCard',false);show('serviceCard',false)}

$('googleLogin').onclick=()=>oauth('google');
$('kakaoLogin').onclick=()=>oauth('kakao');
$('sendLink').onclick=async()=>{const email=$('email').value.trim();if(!email)return status('loginStatus','이메일을 입력해 주세요.','warn');$('sendLink').disabled=true;try{const redirect=`${location.origin}/member`;const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:redirect,shouldCreateUser:true}});if(error)throw error;status('loginStatus','로그인 링크를 보냈습니다. 이메일에서 링크를 열어 주세요.')}catch{status('loginStatus','로그인 링크를 보내지 못했습니다. OAuth 로그인을 이용하거나 Auth Redirect 설정을 확인해 주세요.','error')}finally{$('sendLink').disabled=false}};
$('logout').onclick=async()=>{await sb.auth.signOut();await signedOutUI()};
$('storeSearch').addEventListener('input',renderStores);
$('claimStore').onclick=async()=>{if(!selectedStore)return;const displayName=$('displayName').value.trim(),phone=$('phone').value.trim();if(!displayName||!phone)return status('claimStatus','승인 확인을 위해 이름과 연락처를 입력해 주세요.','warn');$('claimStore').disabled=true;try{const d=await api(MEMBERSHIP,'/claim',{method:'POST',body:JSON.stringify({store_id:selectedStore.id,display_name:displayName,phone,note:$('claimNote').value.trim()})});status('claimStatus',d.already_pending?'이미 승인 대기 중인 신청입니다.':'점포 확인 신청을 접수했습니다. 상인회 승인 후 개인 기능이 열립니다.');await loadClaims()}catch(e){status('claimStatus',e.message==='already_store_member'?'이미 연결된 점포입니다.':e.message==='name_phone_required'?'이름과 연락처를 입력해 주세요.':'신청을 처리하지 못했습니다.','error')}finally{$('claimStore').disabled=false}};
$('activateService').onclick=async()=>{if(!activeApprovedStore)return status('serviceStatus','승인된 점포를 먼저 선택해 주세요.','warn');$('activateService').disabled=true;try{status('serviceStatus','검증 완료 공개 점포정보를 안전하게 연결하고 있습니다.');const d=await api(ONBOARDING,'/activate',{method:'POST',body:JSON.stringify({source_store_id:activeApprovedStore,target_tenant:'ekodibiz',copy_public_menu:$('copyMenu').checked,consent:true})});try{await api(KNOWLEDGE,'/bootstrap',{method:'POST',body:JSON.stringify({store_id:d.target.store_id})})}catch{}const grant=d.link?.grant_project_id?' 지원사업 실증점으로 자동 연결되어 이후 AI 사용량·비용도 사업별로 기록됩니다.':'';status('serviceStatus',`EKODIBIZ 서비스 연결이 완료되었습니다. 기본 점포정보도 AI 지식으로 준비했습니다.${grant}`)}catch(e){status('serviceStatus',e.message==='merchant_access_required'?'점포 승인 권한을 확인해 주세요.':'서비스 연결을 완료하지 못했습니다.','error')}finally{$('activateService').disabled=false}};

const {data:{session:initial}}=await sb.auth.getSession();if(initial)await signedInUI(initial);else await signedOutUI();
sb.auth.onAuthStateChange(async(event,s)=>{if(event==='SIGNED_IN'&&s)await signedInUI(s);if(event==='SIGNED_OUT')await signedOutUI()});
