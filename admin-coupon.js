(()=>{
const $=id=>document.getElementById(id);
const route=x=>window.CGMA_ROUTE?.route(x)||x;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let session=null,entries=[],open=false;
const labels={pending:'검토 대기',approved:'참여 승인',rejected:'미승인'};
async function api(body){
 const token=session?.access_token;if(!token)throw Error('인증 세션이 없습니다.');
 const wire=body?{kind:'coupon',action:body.action,...(body.action==='set_intake'?{open:body.open}:{receipt:body.receipt,state:body.state})}:null;
 const url='https://renzehysxirjilvdxacv.supabase.co/functions/v1/cgma-festival-intake/'+(wire?'admin/action':'admin/coupon');
 const response=await fetch(url,{
  method:wire?'POST':'GET',
  headers:{authorization:'Bearer '+token,apikey:'sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_',...(wire?{'content-type':'application/json'}:{})},
  ...(wire?{body:JSON.stringify(wire)}:{}),cache:'no-store'
 });
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result?.ok)throw Error(result?.error||'서버 연결 실패');
 return result;
}
function render(){
 const approved=entries.filter(x=>x.review_state==='approved').length;
 $('couponAdminSummary').textContent=`총 신청 ${entries.length}건 · 승인 ${approved}건 · ${open?'접수 중':'접수 마감'}`;
 const toggle=$('couponAdminToggle');toggle.textContent=open?'쿠폰 상가 신청 마감':'쿠폰 상가 신청 재개';toggle.dataset.next=String(!open);
 const rows=entries.map(x=>`<tr><td><b>${esc(x.shop_name)}</b><br><small>${esc(x.created_at)}</small></td>
  <td><a href="tel:${esc(x.phone)}">${esc(x.phone)}</a></td>
  <td>${esc(x.location_text)}</td>
  <td>${esc(x.items)}</td>
  <td>${x.membership_choice==='joining'?'가입 신청 의사':x.membership_choice==='regular'?'정회원(확인 필요)':'미확인(기존 접수)'}</td>
  <td><select aria-label="상가 승인 상태" data-coupon-review="${esc(x.receipt)}">
     ${Object.entries(labels).map(([key,label])=>`<option value="${key}" ${x.review_state===key?'selected':''}>${label}</option>`).join('')}
  </select>
  <button type="button" data-coupon-save="${esc(x.receipt)}">저장</button></td></tr>`).join('');
 $('couponAdminList').innerHTML=entries.length?`<table class="festival-table"><thead><tr><th>상호</th><th>연락처</th><th>가게 위치</th><th>품목</th><th>정회원 여부·가입 의사</th><th>참여 여부</th></tr></thead><tbody>${rows}</tbody></table>`:'<p>쿠폰 취급 상가 신청 내역이 없습니다.</p>';
}
async function load(){
 const status=$('couponAdminStatus');status.textContent='신청 현황을 읽는 중입니다.';
 try{const r=await api();entries=r.items||[];open=r.open===true;render();status.textContent='조회 완료';}
 catch(error){status.textContent='조회 실패: '+error.message;}
}
async function update(value){
 const status=$('couponAdminStatus');status.textContent='저장 중입니다.';
 try{await api(value);await load();}
 catch(error){status.textContent='저장 실패: '+error.message;}
}
function start(authSession){
 session=authSession;
 if(!$('couponManager'))return;
 $('couponManager').hidden=false;
 $('couponAdminRefresh')?.addEventListener('click',load);
 $('couponAdminToggle')?.addEventListener('click',()=>{
  const next=$('couponAdminToggle').dataset.next==='true';
  if(!confirm(next?'쿠폰 상가 모집을 다시 시작하시겠습니까?':'쿠폰 상가 신청 접수를 마감하시겠습니까?'))return;
  update({action:'set_intake',open:next});
 });
 $('couponAdminList')?.addEventListener('click',event=>{
  const save=event.target.closest('[data-coupon-save]');if(!save)return;
  const receipt=save.dataset.couponSave;
  const state=save.closest('tr').querySelector('[data-coupon-review]')?.value;
  if(!state)return;
  if(state==='approved'&&!confirm('쿠폰 사용 및 정산 운영 안내를 별도 협의했는지 확인하셨습니까?'))return;
  update({action:'review',receipt,state});
 });
 load();
}
window.CGMA_COUPON_ADMIN=Object.freeze({start,load});
})();