import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const API='https://api.ekodi.kr';
const TENANT='cgma';
const STORAGE_KEY='ekodi-customer-token';
const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const AUTH_URL='https://auth.ekodi.kr/?site=cgma-client&return_to=https%3A%2F%2Fcgma.ekodi.kr%2Fclient%2F';
const sb=createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{detectSessionInUrl:true,persistSession:true}});
const ROLE_LABELS={client_admin:'고객 관리자',client_editor:'콘텐츠 편집자',client_viewer:'조회·검수자'};

const inviteForm=document.querySelector('#inviteForm');
const account=document.querySelector('#account');
const inviteError=document.querySelector('#inviteError');
const authTitle=document.querySelector('#authTitle');
const authCopy=document.querySelector('#authCopy');
const modeBadge=document.querySelector('#modeBadge');
const centralLogin=document.querySelector('#centralLogin');
const loginError=document.querySelector('#loginError');

function token(){return sessionStorage.getItem(STORAGE_KEY)||''}
function formatDate(value){const date=new Date(value);return Number.isNaN(date.getTime())?'확인 필요':date.toLocaleString('ko-KR')}
async function api(path,options={}){const headers=new Headers(options.headers||{});if(token())headers.set('authorization',`Bearer ${token()}`);if(options.body&&!headers.has('content-type'))headers.set('content-type','application/json');const response=await fetch(`${API}${path}`,{...options,headers,cache:'no-store'});let data={};try{data=await response.json()}catch{}if(!response.ok)throw Object.assign(new Error(data.error||`고객 인증 요청 실패 (${response.status})`),{status:response.status,data});return data}

function showLogin(message=''){
  modeBadge.textContent='통합 인증';authTitle.textContent='고객 로그인';authCopy.textContent='EKODI 통합인증센터에서 초대받은 이메일과 같은 Google 계정으로 본인을 확인합니다.';
  centralLogin.hidden=false;inviteForm.hidden=true;account.hidden=true;
  loginError.textContent=message;
}
function showInvite(){
  modeBadge.textContent='초대 확인';authTitle.textContent='고객 권한 활성화';authCopy.textContent='EKODI가 발급한 1회용 고객 초대입니다. 이름을 확인하면 고객 테넌트 권한이 활성화됩니다. 이후 로그인은 Google 통합인증센터만 사용합니다.';
  centralLogin.hidden=true;inviteForm.hidden=false;account.hidden=true;
}
function showAccount(data){
  modeBadge.textContent='인증 완료';authTitle.textContent='고객 관리공간';authCopy.textContent='청계면상인회 EKODI 고객 테넌트의 인증과 권한이 확인되었습니다.';
  centralLogin.hidden=true;inviteForm.hidden=true;account.hidden=false;
  document.querySelector('#accountTenant').textContent=data.tenant?.name||'청계면상인회';
  document.querySelector('#accountEmail').textContent=data.email||'';
  document.querySelector('#accountRole').textContent=ROLE_LABELS[data.role]||data.role||'고객 사용자';
  document.querySelector('#accountExpiry').textContent=formatDate(data.expiresAt);
}

async function restore(){
  if(!token())return showLogin();
  try{showAccount(await api('/api/customer/session'))}
  catch{sessionStorage.removeItem(STORAGE_KEY);showLogin()}
}

async function consumeCentralHandoff(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const tokenHash=hash.get('ekodi_token');
  if(!tokenHash)return false;
  history.replaceState({},document.title,location.pathname+location.search);
  try{
    const {error}=await sb.auth.verifyOtp({token_hash:tokenHash,type:hash.get('ekodi_type')||'email'});
    if(error)throw error;
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.access_token)throw new Error('central_session_missing');
    const result=await api('/api/customer/federated-login',{method:'POST',body:JSON.stringify({tenant:TENANT,accessToken:session.access_token})});
    sessionStorage.setItem(STORAGE_KEY,result.token);showAccount(result);return true;
  }catch(error){
    console.error('EKODI client handoff',error);
    sessionStorage.removeItem(STORAGE_KEY);
    showLogin(error.status===403?'이 Google 계정은 청계면상인회 고객 담당자로 등록되어 있지 않습니다.':'통합인증 연결이 만료되었거나 사용할 수 없습니다. 다시 로그인해 주세요.');
    return false;
  }
}

centralLogin.addEventListener('click',()=>location.assign(AUTH_URL));
inviteForm.addEventListener('submit',async event=>{
  event.preventDefault();inviteError.textContent='';
  if(!inviteForm.checkValidity())return inviteForm.reportValidity();
  const form=new FormData(inviteForm);
  const inviteToken=new URLSearchParams(location.search).get('ekodi_invite')||'';
  const submit=inviteForm.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent='권한 활성화 중…';
  try{
    const result=await api('/api/customer/accept-central-invite',{method:'POST',body:JSON.stringify({token:inviteToken,displayName:String(form.get('displayName')).trim()})});
    sessionStorage.setItem(STORAGE_KEY,result.token);
    const params=new URLSearchParams(location.search);params.delete('ekodi_invite');history.replaceState(null,'',`${location.pathname}${params.toString()?`?${params}`:''}`);
    inviteForm.reset();showAccount(result);
  }catch(error){inviteError.textContent=error.message}
  finally{submit.disabled=false;submit.textContent='초대 수락하고 권한 활성화'}
});

document.querySelector('#logoutButton').addEventListener('click',async()=>{
  try{if(token())await api('/api/customer/logout',{method:'POST'})}catch{}
  sessionStorage.removeItem(STORAGE_KEY);showLogin();
});

const inviteToken=new URLSearchParams(location.search).get('ekodi_invite');
if(inviteToken)showInvite();
else if(!(await consumeCentralHandoff()))await restore();
