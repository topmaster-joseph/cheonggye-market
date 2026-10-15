(()=>{
const $=id=>document.getElementById(id);
const route=value=>window.CGMA_ROUTE?.route(value)||value;
let session=null,items=[],open=false;
const labels={regular:'기존 정회원',joining:'정회원 가입 신청',pending:'심사 대기',selected:'선정',waitlist:'후순위',rejected:'미선정'};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
async function api(payload){
 const token=session?.access_token;if(!token)throw Error('로그인 세션이 만료되었습니다.');
 const res=await fetch(route('/api/festival-booths-admin'),{
 method:payload?'POST':'GET',
 headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
 ...(payload?{body:JSON.stringify(payload)}:{}) ,
 cache:'no-store'
 });
 const data=await res.json().catch(()=>({}));
 if(!res.ok||data.ok!==true)throw Error(({selection_limit_or_membership:'정회원 자격이 미확인 상태이거나 선정 부스 5개가 찼습니다.',intake_unavailable:'접수 DB가 준비되지 않았습니다.',tenant_admin_required:'관리자 권한이 없습니다.'})[data.error]||data.error||'처리 실패');
 return data;
}
function row(item){
 const support=Boolean(item.other_support_selected),verified=Boolean(item.membership_verified);
 return `<tr><td><small>${esc(item.created_at)}</small><br><b>${esc(item.shop_name)}</b><br><span class="muted">${esc(item.receipt)}</span></td>
 <td><a href="tel:${esc(item.phone)}">${esc(item.phone)}</a><br>${esc(item.items)}</td>
 <td>${esc(labels[item.membership_choice])}<br><button type="button" data-action="verify_member" data-value="${verified?'false':'true'}" data-receipt="${esc(item.receipt)}">${verified?'정회원 확인 완료 ✓':'정회원 확인 필요'}</button></td>
 <td><button type="button" data-action="other_support" data-value="${support?'false':'true'}" data-receipt="${esc(item.receipt)}">${support?'다른 사업 선정됨 · 후순위 참고':'다른 사업 선정 여부: 미표시'}</button></td>
 <td><select data-choice="${esc(item.receipt)}" aria-label="부스 선정 상태">
 ${Object.entries(labels).filter(([key])=>['pending','selected','waitlist','rejected'].includes(key)).map(([key,label])=>`<option value="${key}" ${item.selection_state===key?'selected':''}>${label}</option>`).join('')}
 </select><button type="button" data-action="select" data-receipt="${esc(item.receipt)}">저장</button></td></tr>`;
}
function paint(){
 const selected=items.filter(x=>x.selection_state==='selected').length;
 $('festivalAdminSummary').textContent=`접수 ${items.length}건 · 선정 ${selected}/5개 · ${open?'접수 중':'접수 마감'}`;
 $('festivalAdminToggle').textContent=open?'접수 마감하기':'접수 다시 열기';
 $('festivalAdminToggle').dataset.open=String(!open);
 $('festivalAdminList').innerHTML=items.length?'<table class="festival-table"><thead><tr><th>접수</th><th>연락처·품목</th><th>정회원</th><th>중복 지원</th><th>선정</th></tr></thead><tbody>'+items.map(row).join('')+'</tbody></table>':'<p>접수 내역이 없습니다.</p>';
}
async function load(){
 $('festivalAdminStatus').textContent='접수 현황을 확인 중입니다.';
 try{const data=await api();items=data.items||[];open=data.open;paint();$('festivalAdminStatus').textContent='조회 완료';}
 catch(error){$('festivalAdminStatus').textContent='조회 실패: '+error.message;}
}
async function dispatch(payload){
 $('festivalAdminStatus').textContent='처리 중...';
 try{await api(payload);await load();}
 catch(error){$('festivalAdminStatus').textContent='처리 실패: '+error.message;}
}
function start(activeSession){
 session=activeSession;
 const panel=$('festivalManager');if(!panel)return;
 panel.hidden=false;
 $('festivalAdminRefresh')?.addEventListener('click',load);
 $('festivalAdminToggle')?.addEventListener('click',()=>{
 const opening=$('festivalAdminToggle').dataset.open==='true';
 if(!window.confirm(opening?'참여부스 신청 접수를 다시 시작하시겠습니까?':'신청 접수를 마감하시겠습니까?'))return;
 dispatch({action:'set_intake',open:opening});
 });
 $('festivalAdminList')?.addEventListener('click',event=>{
 const button=event.target.closest('button[data-action]');if(!button)return;
 const action=button.dataset.action,receipt=button.dataset.receipt;
 if(action==='select'){
 const state=button.parentElement.querySelector('[data-choice]')?.value;
 if(state==='selected'&&!window.confirm('정회원 확인과 선정 한도, 타 사업 선정 여부를 확인하셨습니까?'))return;
 dispatch({action,receipt,state});
 }else dispatch({action,receipt,[action==='verify_member'?'verified':'selected']:button.dataset.value==='true'});
 });
 load();
}
window.CGMA_FESTIVAL_ADMIN=Object.freeze({start,load});
})();