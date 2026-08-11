import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const MEMBERSHIP=`${SUPABASE_URL}/functions/v1/membership-api`;
const TENANT='cheonggye';
const sb=createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{flowType:'pkce',detectSessionInUrl:true,persistSession:true}});
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function show(id,on=true){$(id).classList.toggle('hide',!on)}
function setStatus(text,type=''){const el=$('status');el.textContent=text;el.className=`status${type?` ${type}`:''}`}
async function session(){const {data}=await sb.auth.getSession();return data.session}
async function api(path,options={}){const s=await session();if(!s)throw new Error('login_required');const headers={apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${s.access_token}`,...(options.headers||{})};if(options.body)headers['content-type']='application/json';const r=await fetch(`${MEMBERSHIP}${path}`,{...options,headers});const data=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(data.error||`http_${r.status}`);e.status=r.status;throw e}return data;}

async function loadPending(){
  show('pendingCard',true);setStatus('승인 대기 신청을 확인하고 있습니다.');
  try{
    const d=await api(`/pending?tenant=${TENANT}`);const claims=d.claims||[];$('count').textContent=`${claims.length}건`;
    if(!claims.length){$('pending').innerHTML='';setStatus('현재 승인 대기 신청이 없습니다.');return}
    setStatus('점포와 신청자 정보를 확인한 뒤 승인 또는 반려하세요.');
    $('pending').innerHTML=claims.map(c=>`<article class="claim-card" data-id="${esc(c.id)}"><span class="badge pending">승인 대기</span><h2 style="margin-top:10px">${esc(c.store?.name||'점포')}</h2><p>${esc(c.store?.public_address||'')}</p><p><b>신청자</b> ${esc(c.applicant?.display_name||'이름 미확인')} · ${esc(c.applicant?.phone||'연락처 미확인')}</p>${c.applicant_note?`<p><b>신청 메모</b> ${esc(c.applicant_note)}</p>`:''}<label>관리 메모 <span class="subtle">선택</span></label><textarea class="review-note" placeholder="승인 또는 반려 사유를 남길 수 있습니다."></textarea><div class="row"><button class="approve">승인</button><button class="danger reject">반려</button></div></article>`).join('');
    $('pending').querySelectorAll('.claim-card').forEach(card=>{
      const run=async decision=>{const buttons=card.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);try{await api('/review',{method:'POST',body:JSON.stringify({claim_id:card.dataset.id,decision,admin_note:card.querySelector('.review-note').value.trim()})});await loadPending()}catch(e){setStatus(e.message==='tenant_admin_required'?'상인회 관리자 권한이 없습니다.':'승인 처리를 완료하지 못했습니다.','error')}finally{buttons.forEach(b=>b.disabled=false)}};
      card.querySelector('.approve').onclick=()=>run('approve');card.querySelector('.reject').onclick=()=>run('reject');
    });
  }catch(e){$('pending').innerHTML='';$('count').textContent='-';setStatus(e.message==='tenant_admin_required'?'이 계정에는 청계면상인회 관리자 권한이 없습니다.':'신청 목록을 불러오지 못했습니다.','error')}
}

async function signedInUI(s){show('loginCard',false);show('accountCard',true);$('accountEmail').textContent=s.user.email||'관리자 계정';await loadPending()}
async function signedOutUI(){show('loginCard',true);show('accountCard',false);show('pendingCard',false)}
$('sendLink').onclick=async()=>{const email=$('email').value.trim();if(!email)return;try{const {error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:`${location.origin}/member-admin`,shouldCreateUser:true}});if(error)throw error;const el=$('loginStatus');el.textContent='로그인 링크를 보냈습니다.';el.className='status'}catch{const el=$('loginStatus');el.textContent='로그인 링크를 보내지 못했습니다. 운영 도메인/Auth 설정을 확인해 주세요.';el.className='status error'}};
$('logout').onclick=async()=>{await sb.auth.signOut();await signedOutUI()};$('refresh').onclick=loadPending;
const {data:{session:initial}}=await sb.auth.getSession();if(initial)await signedInUI(initial);else await signedOutUI();
sb.auth.onAuthStateChange(async(event,s)=>{if(event==='SIGNED_IN'&&s)await signedInUI(s);if(event==='SIGNED_OUT')await signedOutUI()});
