(()=>{
'use strict';
const script=document.currentScript;
const root=new URL('.',script.src);
const api=new URL('api/admin-session',root);
const authBase='https://renzehysxirjilvdxacv.supabase.co';
const publishable='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const allowed=new Map([
  ['merchantManager','점포·회원 관리'],
  ['noticeManager','공지·행사 관리'],
  ['resourceManager','공식 자료 관리'],
  ['siteModeManager','첫 화면 관리'],
  ['languageManager','다국어 관리'],
  ['controlTower','상권 운영 현황'],
  ['educationSurveyManager','교육 수요조사 통계'],
  ['festivalManager','축제 부스 접수·선정'],
  ['couponManager','쿠폰 참여 상가 관리'],
  ['memberReview','정회원 신청 승인'],
  ['petitionManager','주차장 동의접수']
]);
const publicOnly=new Set(['memberReview','petitionManager','festivalManager']);
let active=false,opened=false,drawer,frame,previousFocus;
// A ?manage= deep link (e.g. the 접수현황 link) must never fail silently. When this browser has no
// verified CGMA administrator session, send the visitor once to the full admin page, which offers
// sign-in and opens the same panel by hash. The server still verifies every grant there.
const requestedManage=(()=>{try{const id=new URLSearchParams(location.search).get('manage');return id&&allowed.has(id)?id:null}catch{return null}})();
let manageHandled=false;
function fallbackToAdmin(){
  if(!requestedManage||manageHandled)return;
  manageHandled=true;
  const dest=new URL('admin/',root);
  dest.hash=requestedManage;
  location.assign(dest.href);
}
const page=location.pathname.includes('/ai-education/')?'education':
  location.pathname.includes('/festival/2026/apply/')?'festival':
  location.pathname.includes('/festival/2026/coupon/')?'coupon':'home';
const targets={
  home:[
    ['siteModeManager','top','첫 화면 관리'],
    ['merchantManager','market-map','점포 정보 관리'],
    ['resourceManager','resources','자료 관리'],
    ['controlTower','market-map','상권 운영 현황'],
    ['languageManager','about','번역 관리']
  ],
  education:[['educationSurveyManager',null,'설문 통계·공유 관리']],
  festival:[['festivalManager',null,'축제 신청·선정 관리']],
  coupon:[['couponManager',null,'쿠폰 참여 점포 관리']]
};
function element(tag,cls,label){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(label)el.textContent=label;
  return el;
}
function makeButton(id,label){
  const b=element('button','cgma-manage-button',label);
  b.type='button';b.dataset.cgmaManage=id;
  b.addEventListener('click',()=>open(id));
  return b;
}
function showButton(id,section,label){
  const node=section?document.getElementById(section):document.querySelector('main');
  if(!node)return;
  const heading=section==='top'?node.querySelector('.cgma-hero-message'):
    (section?node.querySelector('h2,h3'):node.querySelector('h1,h2'));
  const anchor=heading||node;
  const b=makeButton(id,label);
  b.setAttribute('aria-label',label+' (관리자 전용)');
  if(heading)anchor.insertAdjacentElement('afterend',b);
  else anchor.insertAdjacentElement('afterbegin',b);
}
function render(){
  if(active)return;
  active=true;
  document.documentElement.classList.add('cgma-can-manage');
  const controls=targets[page]||[];
  const surveyLink=document.getElementById('adminStatsLink');
  if(page==='education'&&surveyLink){
    surveyLink.hidden=false;
    surveyLink.href='?manage=educationSurveyManager';
    surveyLink.onclick=event=>{event.preventDefault();open('educationSurveyManager')};
  }else{
    controls.forEach(([id,section,label])=>showButton(id,section,label));
  }
  const params=new URLSearchParams(location.search);
  const incoming=params.get('manage');
  if(incoming&&allowed.has(incoming)){
    manageHandled=true;
    params.delete('manage');
    const next=location.pathname+(params.toString()?'?'+params:'')+location.hash;
    history.replaceState(history.state,'',next);
    open(incoming);
  }
}
function close(){
  if(!opened)return;
  opened=false;
  drawer.hidden=true;
  document.documentElement.classList.remove('cgma-management-open');
  frame.removeAttribute('src');
  previousFocus?.focus?.();
  previousFocus=null;
  // Reflect successful changes using the site's normal public-data fetch paths.
  window.CGMA_NOTICE_BOARD?.reload?.();
}
function createDrawer(){
  drawer=element('div','cgma-management-overlay');
  drawer.hidden=true;
  drawer.setAttribute('role','presentation');
  const panel=element('section','cgma-management-dialog');
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-label','현재 페이지 직접 관리');
  const top=element('div','cgma-management-head');
  const title=element('strong','cgma-management-title','현재 페이지 관리');
  title.id='cgmaManageTitle';
  const actions=element('div','cgma-management-actions');
  const reload=element('button','cgma-management-reload','변경사항 반영');
  reload.type='button';
  reload.addEventListener('click',()=>location.reload());
  const x=element('button','cgma-management-close','닫기');
  x.type='button';
  x.addEventListener('click',close);
  actions.append(reload,x);
  top.append(title,actions);
  frame=element('iframe','cgma-management-frame');
  frame.title='청계면상인회 권한 확인 후 관리 도구';
  frame.referrerPolicy='same-origin';
  panel.append(top,frame);
  drawer.append(panel);
  drawer.addEventListener('click',ev=>{if(ev.target===drawer)close()});
  document.addEventListener('keydown',ev=>{if(opened&&ev.key==='Escape'){ev.preventDefault();close()}});
  document.body.append(drawer);
}
function open(id){
  if(!active||!allowed.has(id))return;
  if(!drawer)createDrawer();
  previousFocus=document.activeElement;
  const dest=new URL('admin/',root);
  dest.searchParams.set('inline','1');
  dest.searchParams.set('section',id);
  dest.hash=id;
  drawer.querySelector('.cgma-management-title').textContent=allowed.get(id);
  frame.src=dest.href;
  drawer.hidden=false;
  opened=true;
  document.documentElement.classList.add('cgma-management-open');
  drawer.querySelector('.cgma-management-close').focus();
}
// The public survey is deliberately allowed to run with a strict self-only CSP.
// Reuse the existing Supabase session kept by the EKODI login bridge when the
// optional browser SDK is unavailable; the *server* still verifies every grant.
const sessionStorageKey='sb-renzehysxirjilvdxacv-auth-token';
let authCheck=0;
let localClient;
function readStoredAccessToken(){
  try{
    const raw=localStorage.getItem(sessionStorageKey);
    if(!raw)return null;
    const stored=JSON.parse(raw);
    return typeof stored?.access_token==='string'&&stored.access_token.length>20
      ?stored.access_token:null;
  }catch{return null}
}
async function accessToken(){
  // Avoid a separate dependency for an already-authenticated same-origin page.
  const persisted=readStoredAccessToken();
  if(persisted)return persisted;
  if(!window.supabase?.createClient)return null;
  try{
    localClient=window.__CGMA_NOTICE_AUTH||localClient||
      window.supabase.createClient(authBase,publishable);
    return (await localClient.auth.getSession()).data?.session?.access_token||null;
  }catch{return null}
}
function revokeControls(){
  if(!active)return;
  active=false;
  document.documentElement.classList.remove('cgma-can-manage');
  document.querySelectorAll('.cgma-manage-button').forEach(button=>button.remove());
  const surveyLink=document.getElementById('adminStatsLink');
  if(surveyLink){surveyLink.hidden=true;surveyLink.onclick=null}
  close();
}
async function authorize(){
  const sequence=++authCheck;
  // The access token never travels in a URL or to an external server.
  if(api.origin!==location.origin){revokeControls();return}
  try{
    const token=await accessToken();
    if(sequence!==authCheck)return;
    if(!token){revokeControls();fallbackToAdmin();return}
    const res=await fetch(api.href,{
      headers:{Authorization:'Bearer '+token},
      cache:'no-store',credentials:'same-origin'
    });
    const grant=await res.json().catch(()=>({}));
    if(sequence!==authCheck)return;
    if(res.ok&&grant.allowed===true)render();
    else{revokeControls();fallbackToAdmin()}
  }catch(error){
    if(sequence!==authCheck)return;
    revokeControls();
    fallbackToAdmin();
    console.warn('CGMA manager permission unavailable',error);
  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',authorize,{once:true});
else authorize();
window.addEventListener('focus',authorize);
window.addEventListener('storage',event=>{if(event.key===sessionStorageKey||event.key===null)authorize()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)authorize()});
})();
