import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://renzehysxirjilvdxacv.supabase.co';
const PUBLISHABLE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const sb=createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{detectSessionInUrl:true,persistSession:true}});

const button=document.querySelector('[data-central-auth]');
const statusEl=document.querySelector('[data-central-auth-status]');
const site=button?.dataset.site||'cgma';
const returnTo=button?.dataset.returnTo||location.href.split('#')[0];
const authUrl=`https://auth.ekodi.kr/?site=${encodeURIComponent(site)}&return_to=${encodeURIComponent(returnTo)}`;

function status(text,type=''){
  if(!statusEl)return;
  statusEl.textContent=text;
  statusEl.className=`status${type?` ${type}`:''}`;
  statusEl.classList.remove('hide');
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
    status('통합인증이 완료되었습니다.');
    location.reload();
    return true;
  }catch(error){
    console.error('EKODI central auth bridge',error);
    status('통합인증 연결이 만료되었거나 이미 사용되었습니다. 다시 로그인해 주세요.','error');
    return false;
  }
}

if(button){
  button.addEventListener('click',()=>{
    status('EKODI 통합인증센터로 이동합니다.');
    location.assign(authUrl);
  });
}

await consumeHandoff();
