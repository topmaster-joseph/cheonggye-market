// 상인 AI 마케팅 교육(2026.11.6~12.18) 참가 신청 공개 화면. 관리자는 별도 권한 확인 페이지로 이동합니다.
// 원본: Supabase cgma_ai_edu_2026_* (RLS 직접접근 차단, security definer RPC만).
(()=>{
'use strict';
const P=window.CGMA_PROGRAMS;
const $=id=>document.getElementById(id);
const SESSIONS=[[1,'11/6 금'],[2,'11/13 금'],[3,'11/20 금'],[4,'11/25 수'],[5,'11/27 금'],[6,'12/4 금'],[7,'12/11 금'],[8,'12/18 금']];
const INTERESTS=['사진·이미지','숏폼 영상','영상 편집','홍보문구','인스타그램','네이버 플레이스','리뷰 답글','예약·톡톡'];
const digits=v=>String(v||'').replace(/\D/g,'');
const fmtPhone=v=>{const d=digits(v).slice(0,11);if(d.length<4)return d;if(d.length<8)return d.slice(0,3)+'-'+d.slice(3);return d.slice(0,3)+'-'+d.slice(3,d.length-4)+'-'+d.slice(-4)};
const rpc=(fn,body,auth)=>P.rpc(fn,body,{auth});

// The application stays open to guests; the Google login/logout header merely
// reflects a validated EKODI session and does not authorize private roster RPCs.
const loginLink=$('ai-edu-login'),logoutButton=$('ai-edu-logout');
async function refreshAuthControls(){
  if(!loginLink||!logoutButton)return;
  loginLink.href=P.loginUrl();
  const user=await P.currentUser();
  loginLink.hidden=Boolean(user);
  logoutButton.hidden=!user;
  logoutButton.disabled=false;
  logoutButton.textContent='로그아웃';
}
if(loginLink&&logoutButton){
  logoutButton.addEventListener('click',async()=>{
    logoutButton.disabled=true;
    logoutButton.textContent='로그아웃 중…';
    try{
      await P.signOut();
      await refreshAuthControls();
    }catch{
      logoutButton.disabled=false;
      logoutButton.textContent='로그아웃';
      const status=$('ai-edu-auth-status');
      if(status){status.hidden=false;status.textContent='로그아웃에 실패했습니다. 다시 시도해 주세요.'}
    }
  });
  // A static sign-in link is present even when scripts or Auth are unavailable.
  refreshAuthControls();
}

['f-phone','l-phone'].forEach(id=>$(id).addEventListener('input',e=>{e.target.value=fmtPhone(e.target.value)}));
const box=$('sessions');
SESSIONS.forEach(([n,d])=>{const l=document.createElement('label');l.innerHTML=`<input type="checkbox" name="available_sessions" id="f-s-${n}" value="${n}"><b>${n}회 · ${d}</b>`;box.append(l)});
$('all-sessions').addEventListener('click',()=>{const bs=box.querySelectorAll('input');const all=[...bs].every(b=>b.checked);bs.forEach(b=>{b.checked=!all});$('all-sessions').textContent=all?'전체 선택':'전체 해제'});

async function loadSeats(){
  const el=$('seats');
  try{
    const s=await rpc('cgma_ai_edu_2026_public_stats',{});
    if(!s.is_open){el.textContent='신청이 마감되었습니다.';el.className='seats closed';$('submit').disabled=true;return}
    const left=Math.max(0,s.capacity-s.active);
    el.innerHTML=left>0?`선착순 <b>${s.capacity}명</b> · 남은 자리 <b>${left}석</b>`:`정원 ${s.capacity}명이 찼습니다 · 지금 신청하면 <b>대기 ${s.waiting+1}번</b>으로 접수됩니다`;
  }catch{el.textContent='선착순 15명 모집'}
}
loadSeats();

const errText={phone:'휴대폰 번호를 010으로 시작하는 숫자로 정확히 적어 주세요.',consent:'개인정보 수집·이용 동의(필수)에 체크해 주세요.',closed:'신청이 마감되었습니다. 상인회로 문의해 주세요.',invalid:'입력값을 다시 확인해 주세요.'};
function showErr(msg,focusId){const e=$('form-error');e.textContent=msg;e.hidden=false;if(focusId){const f=$(focusId);f.focus();f.scrollIntoView({block:'center',behavior:'smooth'})}}
$('apply').addEventListener('submit',async ev=>{
  ev.preventDefault();$('form-error').hidden=true;
  const f=ev.target,val=n=>(f.elements[n].value||'').trim(),radio=n=>(f.querySelector(`input[name="${n}"]:checked`)||{}).value||'',multi=n=>[...f.querySelectorAll(`input[name="${n}"]:checked`)].map(i=>i.value);
  const d={name:val('name'),store_name:val('store_name'),business_type:val('business_type'),phone:digits(val('phone')),role:radio('role'),phone_os:radio('phone_os'),ai_level:radio('ai_level'),interests:multi('interests'),available_sessions:multi('available_sessions').map(Number),needs:val('needs'),consent_privacy:$('f-privacy').checked,consent_photo:$('f-photo').checked};
  if(!d.name)return showErr('성명을 적어 주세요.','f-name');
  if(!d.store_name)return showErr('상호명을 적어 주세요.','f-store');
  if(!d.business_type)return showErr('업종을 적어 주세요.','f-biz');
  if(!/^01\d{8,9}$/.test(d.phone))return showErr(errText.phone,'f-phone');
  if(!d.role)return showErr('대표 / 종사자 중 하나를 골라 주세요.','f-role-1');
  if(!d.phone_os)return showErr('사용하는 휴대폰 종류를 골라 주세요.','f-os-1');
  if(!d.ai_level)return showErr('AI 사용 경험을 골라 주세요.','f-ai-1');
  if(!d.consent_privacy)return showErr(errText.consent,'f-privacy');
  const btn=$('submit');btn.disabled=true;btn.textContent='접수 중…';
  try{
    const r=await rpc('cgma_ai_edu_2026_apply',{p:d});
    if(!r.ok)throw Object.assign(new Error(r.error),{code:r.error});
    f.hidden=true;$('done-no').textContent=r.receipt_no;
    if(r.duplicate){$('done-title').textContent='이미 신청하신 번호입니다';$('done-msg').textContent=`이 휴대폰 번호로 접수된 신청이 있습니다. 현재 상태: ${r.status}. 내용을 바꾸려면 상인회로 연락해 주세요.`}
    else if(r.status==='대기'){$('done-title').textContent='대기자로 접수되었습니다';$('done-msg').textContent='정원이 차서 대기 순번으로 접수되었습니다. 자리가 나면 순서대로 문자로 연락드립니다.'}
    else{$('done-title').textContent='신청이 접수되었습니다';$('done-msg').textContent=`참가가 확정되면 ${fmtPhone(d.phone)} 번호로 안내 문자를 보내드립니다. 첫 수업은 11월 6일(금)입니다.`}
    $('done').hidden=false;$('done').focus();loadSeats();
  }catch(e){showErr(errText[e.code]||'접수 중 연결이 끊겼습니다. 잠시 후 다시 [신청하기]를 눌러 주세요. (같은 번호로 두 번 접수되지는 않습니다)')}
  finally{btn.disabled=false;btn.textContent='신청하기'}
});
$('again').addEventListener('click',()=>{const f=$('apply');f.reset();f.hidden=false;$('done').hidden=true;$('all-sessions').textContent='전체 선택';$('f-name').focus()});
$('lookup').addEventListener('submit',async ev=>{
  ev.preventDefault();const out=$('lookup-result');const name=$('l-name').value.trim(),phone=digits($('l-phone').value);
  if(!name||!/^01\d{8,9}$/.test(phone)){out.textContent='성명과 휴대폰 번호를 정확히 적어 주세요.';return}
  out.textContent='확인 중…';
  try{
    const r=await rpc('cgma_ai_edu_2026_lookup',{p_name:name,p_phone:phone});
    if(!r.found){out.textContent='일치하는 신청이 없습니다. 성명·번호를 다시 확인해 주세요.';return}
    const label={'접수':'접수됨 (확정 안내 예정)','확정':'참가 확정','대기':'대기 중','취소':'취소됨'}[r.status]||r.status;
    out.textContent='';const b=document.createElement('b');b.textContent=`${r.receipt_no} · ${r.store_name}`;const s=document.createElement('span');s.className='pill st-'+r.status;s.textContent=label;out.append(b,' ',s);
  }catch{out.textContent='연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.'}
});
// 하단 관리자 진입: 로그인 전에는 중앙 로그인 후 신청현황 화면으로 돌아오고,
// 이미 로그인했으면 신청현황 화면으로 바로 이동한다. 권한은 신청현황 화면과 DB가 다시 확인한다.
(async()=>{
  const entry=$('ai-edu-admin-entry'),label=$('ai-edu-admin-entry-label');
  if(!entry)return;
  const manageHref=P.route('/programs/ai-marketing-2026/manage/');
  entry.href='https://ekodi.kr/auth/?site=cgma&direct=1&return_to='+encodeURIComponent(new URL(manageHref,location.origin).href);
  try{await P.whenAuthReady();if(await P.currentUser()){entry.href=manageHref;label.textContent='신청현황 바로 보기';}}catch{}
})();
// Legacy bookmarks from the previous combined screen must remain functional.
// Finish any central-auth OTP handoff before moving to the separate admin page.
if(location.hash==='#manage'){
  P.whenAuthReady().finally(()=>location.replace(P.route('/programs/ai-marketing-2026/manage/')));
}
})();
