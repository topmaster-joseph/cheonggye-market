import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const sb=createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{detectSessionInUrl:true,persistSession:true}});

const button=document.querySelector('[data-central-auth]');
const statusEl=document.querySelector('[data-central-auth-status]');
const site=button?.dataset.site||'cgma';
const returnTo=button?.dataset.returnTo||location.href.split('#')[0];
const MEMBER_APPLY='https://cgma.ekodi.kr/member?apply=1';
const authUrl=`https://auth.ekodi.kr/?site=${encodeURIComponent(site)}&return_to=${encodeURIComponent(returnTo)}`;
const memberAuthUrl=`https://auth.ekodi.kr/?site=${encodeURIComponent(site)}&return_to=${encodeURIComponent(MEMBER_APPLY)}`;

function status(text,type=''){
  if(!statusEl)return;
  statusEl.textContent=text;
  statusEl.className=`auth-message${type?` ${type}`:''}`;
}

async function consumeHandoff(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const tokenHash=hash.get('ekodi_token');
  if(!tokenHash)return false;
  history.replaceState({},document.title,location.pathname+location.search);
  status('EKODI 통합인증 정보를 확인하고 있습니다.');
  try{
    const {error}=await sb.auth.verifyOtp({token_hash:tokenHash,type:hash.get('ekodi_type')||'email'});
    if(error)throw error;
    status('Google 무료 로그인이 완료되었습니다.');
    location.reload();
    return true;
  }catch(error){
    console.error('EKODI central auth bridge',error);
    status('통합인증 연결이 만료되었거나 이미 사용되었습니다. 다시 로그인해 주세요.','error');
    return false;
  }
}

function routeToAuth(url,message){
  status(message);
  location.assign(url);
}

function updateJoinArea(s){
  const signedIn=Boolean(s);
  const loginButton=document.querySelector('[data-central-auth]');
  const loginPanel=document.querySelector('.login-provider.google');
  const joinLinks=[...document.querySelectorAll('a.nav-cta[href="#join"], a[href="#join-form"]')];
  const joinCopy=document.querySelector('#join > div:nth-child(2) > p');
  const joinForm=document.getElementById('join-form');

  if(loginButton){
    loginButton.textContent=signedIn?'내 계정':'Google 무료 로그인';
    loginButton.href=signedIn?'/member':'#login';
    loginButton.onclick=event=>{
      event.preventDefault();
      if(signedIn)location.assign('/member');
      else routeToAuth(authUrl,'Google 무료 로그인을 위해 EKODI 통합인증센터로 이동합니다.');
    };
  }

  if(loginPanel){
    loginPanel.href=signedIn?'/member':authUrl;
    loginPanel.innerHTML=`<span>G</span> ${signedIn?'내 계정으로 계속':'Google로 무료 로그인'}`;
    loginPanel.onclick=event=>{
      event.preventDefault();
      if(signedIn)location.assign('/member');
      else routeToAuth(authUrl,'Google 무료 로그인을 위해 EKODI 통합인증센터로 이동합니다.');
    };
  }

  joinLinks.forEach(link=>{
    link.textContent=signedIn?'정회원 신청':'가입하기';
    link.href=signedIn?'/member?apply=1':'#login';
    link.removeAttribute('target');
    link.onclick=event=>{
      event.preventDefault();
      if(signedIn)location.assign('/member?apply=1');
      else routeToAuth(memberAuthUrl,'먼저 Google 무료 로그인을 진행합니다. 로그인 후 정회원 추가정보 입력 화면으로 이어집니다.');
    };
  });

  if(joinCopy){
    joinCopy.textContent=signedIn
      ? 'Google 무료 로그인이 확인되었습니다. 정회원으로 신청할 때만 상가·사업자 등 추가정보를 입력합니다.'
      : '가입하기를 누르면 먼저 Google 계정으로 무료 로그인합니다. 이후 정회원 신청을 선택할 때만 상가·사업자 등 추가정보를 입력합니다.';
  }

  if(joinForm){
    const heading=joinForm.querySelector('.join-form-head h2');
    const description=joinForm.querySelector('.join-form-head p');
    const action=joinForm.querySelector('.join-form-head a');
    const embedded=joinForm.querySelector('.embedded-form-wrap');
    const privacy=joinForm.querySelector('.form-privacy-note');
    if(heading)heading.textContent='Google 로그인 후 정회원 신청';
    if(description)description.textContent='무료 로그인 단계에서는 Google 계정만 확인합니다. 정회원 신청 단계에서 필요한 추가정보를 입력해 주세요.';
    if(action){
      action.textContent=signedIn?'정회원 신청 화면 →':'Google 로그인 후 신청 →';
      action.href=signedIn?'/member?apply=1':memberAuthUrl;
      action.removeAttribute('target');
    }
    if(embedded)embedded.hidden=true;
    if(privacy)privacy.textContent='기존 Google 설문은 기본 가입 절차에서 사용하지 않습니다. 정회원 심사에 필요한 정보만 별도 신청 화면에서 받습니다.';
  }

  if(statusEl){
    status(signedIn
      ? `${s.user.email||'Google 계정'} 무료 로그인 완료 · 정회원 신청 시 추가정보를 입력합니다.`
      : 'Google 로그인만으로 무료회원 계정을 시작할 수 있습니다. 정회원 신청 시에만 추가정보를 받습니다.');
  }
}

await consumeHandoff();
const {data:{session}}=await sb.auth.getSession();
updateJoinArea(session);
sb.auth.onAuthStateChange((_event,s)=>updateJoinArea(s));
