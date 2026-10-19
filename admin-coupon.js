(()=>{
const $=id=>document.getElementById(id);
const route=x=>window.CGMA_ROUTE?.route(x)||x;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const EDGE='https://renzehysxirjilvdxacv.supabase.co/functions/v1/cgma-festival-intake/';
const KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
let session=null,entries=[],history=[],open=false;
const labels={pending:'검토 대기',approved:'참여 승인',rejected:'미승인'};
const when=x=>{const d=new Date(x);return Number.isNaN(d.getTime())?'':d.toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})};
async function api(body){
 const token=session?.access_token;if(!token)throw Error('인증 세션이 없습니다.');
 const wire=body?{kind:'coupon',action:body.action,...(body.action==='set_intake'?{open:body.open}:{receipt:body.receipt,state:body.state})}:null;
 const url=EDGE+(wire?'admin/action':'admin/coupon');
 const response=await fetch(url,{
  method:wire?'POST':'GET',
  headers:{authorization:'Bearer '+token,apikey:KEY,...(wire?{'content-type':'application/json'}:{})},
  ...(wire?{body:JSON.stringify(wire)}:{}),cache:'no-store'
 });
 const result=await response.json().catch(()=>null);
 if(!response.ok||!result?.ok)throw Error(result?.error||'서버 연결 실패');
 return result;
}
function trail(receipt){
 const rows=history.filter(h=>h.receipt===receipt).sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
 if(!rows.length)return '';
 return '<details><summary>처리 이력 '+rows.length+'건</summary><ol style="margin:6px 0 0;padding-left:18px">'+rows.map(h=>
  `<li>${esc(when(h.created_at))} · ${h.event==='submitted'?'신청 접수':esc(labels[h.from_state]||h.from_state||'')+' → '+esc(labels[h.to_state]||h.to_state)}${h.actor_email?' · '+esc(h.actor_email):''}</li>`).join('')+'</ol></details>';
}
function render(){
 const approved=entries.filter(x=>x.review_state==='approved').length;
 const rejected=entries.filter(x=>x.review_state==='rejected').length;
 $('couponAdminSummary').textContent=`총 신청 ${entries.length}건 · 승인 ${approved}건 · 검토 대기 ${entries.length-approved-rejected}건 · 미승인 ${rejected}건 · ${open?'접수 중':'접수 마감'}`;
 const toggle=$('couponAdminToggle');toggle.textContent=open?'쿠폰 상가 신청 마감':'쿠폰 상가 신청 재개';toggle.dataset.next=String(!open);
 const rows=entries.map(x=>`<tr><td><b>${esc(x.shop_name)}</b><br><small>${esc(when(x.created_at))}</small>${trail(x.receipt)}</td>
  <td><a href="tel:${esc(x.phone)}">${esc(x.phone)}</a></td>
  <td>${esc(x.location_text)}</td>
  <td>${esc(x.items)}</td>
  <td><select aria-label="상가 승인 상태" data-coupon-review="${esc(x.receipt)}">
     ${Object.entries(labels).map(([key,label])=>`<option value="${key}" ${x.review_state===key?'selected':''}>${label}</option>`).join('')}
  </select>
  <button type="button" data-coupon-save="${esc(x.receipt)}">저장</button></td></tr>`).join('');
 $('couponAdminList').innerHTML=entries.length?`<table class="festival-table"><thead><tr><th>상호</th><th>연락처</th><th>가게 위치</th><th>품목</th><th>참여 여부</th></tr></thead><tbody>${rows}</tbody></table>`:'<p>쿠폰 취급 상가 신청 내역이 없습니다.</p>';
}
async function load(){
 const status=$('couponAdminStatus');status.textContent='신청 현황을 읽는 중입니다.';
 try{const r=await api();entries=r.items||[];history=Array.isArray(r.history)?r.history:[];open=r.open===true;render();status.textContent='조회 완료';}
 catch(error){status.textContent='조회 실패: '+error.message;}
}
async function update(value){
 const status=$('couponAdminStatus');status.textContent='저장 중입니다.';
 try{await api(value);await load();}
 catch(error){status.textContent='저장 실패: '+error.message;}
}
async function downloadCsv(){
 const status=$('couponAdminStatus');
 const token=session?.access_token;if(!token){status.textContent='인증 세션이 없습니다.';return;}
 status.textContent='명단 파일을 만드는 중입니다.';
 try{
  const response=await fetch(EDGE+'admin/coupon.csv',{headers:{authorization:'Bearer '+token,apikey:KEY},cache:'no-store'});
  if(!response.ok){const r=await response.json().catch(()=>null);throw Error(r?.error||('HTTP '+response.status));}
  const blob=await response.blob();
  const name=/filename="([^"]+)"/.exec(response.headers.get('content-disposition')||'')?.[1]||'cgma-coupon-merchants.csv';
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status.textContent='다운로드 완료: '+name+' (연락처 포함 — 외부 공유 금지)';
 }catch(error){status.textContent='다운로드 실패: '+error.message;}
}
function start(authSession){
 session=authSession;
 if(!$('couponManager'))return;
 $('couponManager').hidden=false;
 $('couponAdminRefresh')?.addEventListener('click',load);
 $('couponAdminCsv')?.addEventListener('click',downloadCsv);
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
  if(state==='approved'&&!confirm('쿠폰 사용 및 정산 운영 안내를 별도 협의했는지 확인하셨습니까?\n승인하면 상호·위치·품목이 공개 목록에 표시됩니다.'))return;
  update({action:'review',receipt,state});
 });
 load();
}
window.CGMA_COUPON_ADMIN=Object.freeze({start,load});
})();
