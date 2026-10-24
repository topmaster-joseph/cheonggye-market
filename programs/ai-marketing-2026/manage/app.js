// 청계면상인회 AI 마케팅 교육 — 별도 관리자 화면 (공개 신청과 분리).
// No applicant records are requested until the server verifies site-admin JWT.
(()=>{
'use strict';
const P=window.CGMA_PROGRAMS;
const $=id=>document.getElementById(id);
const esc=P.esc;
const SESSIONS=[[1,'11/6 금'],[2,'11/13 금'],[3,'11/20 금'],[4,'11/25 수'],[5,'11/27 금'],[6,'12/4 금'],[7,'12/11 금'],[8,'12/18 금']];
const digits=v=>String(v||'').replace(/\D/g,'');
const fmtPhone=v=>{const d=digits(v).slice(0,11);if(d.length<4)return d;if(d.length<8)return d.slice(0,3)+'-'+d.slice(3);return d.slice(0,3)+'-'+d.slice(3,d.length-4)+'-'+d.slice(-4)};
const rpc=(fn,body,auth)=>P.rpc(fn,body,{auth});
const panel=$('manage');let admin=false,expandedId=null,rows=[],settings={capacity:15,is_open:true};
const STATUS_OPTIONS=['접수','확정','대기','취소'];
const selectedIds=new Set();
let statusBusy=false;
// The static login CTA is in the HTML before authentication scripts run.
// Upgrade its return URL for the current domain, preserving the EKODI /cgma path.
const initialLogin=$('cgma-roster-login');
if(initialLogin)initialLogin.href=P.loginUrl();
// Header controls are available on both EKODI and the CGMA custom domain.
// Signing out immediately removes sensitive applicant data and reloads the guest gate.
const headerLogin=$('cgma-manage-login'),headerLogout=$('cgma-manage-logout');
const headerAuthMessage=$('cgma-manage-auth-message');
if(headerLogin)headerLogin.href=P.loginUrl();
function showSignedInHeader(){
  if(headerLogin)headerLogin.hidden=true;
  if(headerLogout)headerLogout.hidden=false;
}
if(headerLogout){
  headerLogout.addEventListener('click',async()=>{
    if(headerLogout.disabled)return;
    headerLogout.disabled=true;
    headerLogout.textContent='로그아웃 중…';
    if(headerAuthMessage)headerAuthMessage.hidden=true;
    try{
      await P.signOut();
      rows=[];expandedId=null;
      panel.innerHTML='<div class="manager-gate"><h2>로그아웃되었습니다</h2><p class="msg">신청자 정보 화면을 종료했습니다.</p></div>';
      if(headerLogin)headerLogin.hidden=false;
      headerLogout.hidden=true;
      // Hard navigation clears private DOM, cancels auto-refresh, and resets auth state.
      location.replace(location.pathname+location.search);
    }catch{
      headerLogout.disabled=false;
      headerLogout.textContent='로그아웃';
      if(headerAuthMessage){
        headerAuthMessage.textContent='로그아웃하지 못했습니다. 다시 시도해 주세요.';
        headerAuthMessage.hidden=false;
      }
    }
  });
  // Signed-in users without this particular roster role must still be able to sign out.
  P.currentUser().then(user=>{if(user)showSignedInHeader()}).catch(()=>{});
}
// A roster-scoped member is authenticated independently of CGMA site administration.
function panelShell(){
  panel.innerHTML=`<div class="row" style="justify-content:space-between"><h2>신청현황 관리 <small style="font-weight:400;font-size:13px">관리자에게만 보입니다 · 변경 이력 기록</small></h2><div class="row"><button class="btn" id="m-refresh" type="button">새로고침</button><button class="btn" id="m-csv" type="button">엑셀(CSV) 받기</button><button class="btn" id="m-copy" type="button">확정자 번호 복사</button></div></div>
  <div class="tiles" id="m-tiles"></div>
  <div class="row"><label class="row">정원 <input id="m-cap" type="number" min="1" max="200" inputmode="numeric"> 명</label><label class="row switch"><input type="checkbox" id="m-open"> 신청 받기</label><button class="btn" id="m-save" type="button">설정 저장</button></div>
  <p class="msg" id="m-msg" aria-live="polite"></p>
  <div class="row"><input id="m-q" placeholder="이름·상호·번호 검색" aria-label="검색" style="flex:1 1 200px;min-height:40px;font-size:15px"><select id="m-st" aria-label="상태 필터" style="width:auto!important"><option value="">전체 상태</option><option>접수</option><option>확정</option><option>대기</option><option>취소</option></select></div>
  <div class="m-bulk" aria-label="선택 신청자 일괄 상태 변경">
    <label>일괄 접수상태 <select id="m-bulk-status" aria-label="일괄 변경할 접수상태"><option value="">상태 선택</option>${STATUS_OPTIONS.map(v=>'<option>'+v+'</option>').join('')}</select></label>
    <button class="btn" id="m-bulk-apply" type="button" disabled>선택 0명 변경</button>
    <button class="btn" id="m-select-visible" type="button">현재 목록 전체 선택</button>
    <button class="btn" id="m-clear-selection" type="button">선택 해제</button>
    <span class="m-bulk-count" id="m-selected-count" aria-live="polite">0명 선택</span>
  </div>
  <p class="m-list-help">목록에서 접수상태를 바로 변경하거나, 여러 명을 선택해 일괄 변경하세요. 이름을 누르면 상세정보·출석·메모를 관리합니다.</p>
  <div class="wrap-table"><table class="m-roster"><thead><tr><th class="m-select-th"><input type="checkbox" id="m-check-all" aria-label="현재 목록 전체 선택"></th><th>신청자 · 상호</th><th>접수일</th><th>접수상태 바로 변경</th><th>상세</th></tr></thead><tbody id="m-body"></tbody></table></div>`;
  $('m-refresh').onclick=()=>loadAdmin();
  $('m-q').oninput=()=>{selectedIds.clear();renderRows()};
  $('m-st').onchange=()=>{selectedIds.clear();renderRows()};
  $('m-bulk-status').onchange=syncBulkControls;
  $('m-bulk-apply').onclick=bulkUpdateStatus;
  $('m-select-visible').onclick=()=>{filtered().forEach(r=>selectedIds.add(r.id));renderRows()};
  $('m-clear-selection').onclick=()=>{selectedIds.clear();renderRows()};
  $('m-check-all').onchange=ev=>{
    const ids=filtered().map(r=>r.id);
    if(ev.target.checked)ids.forEach(id=>selectedIds.add(id));
    else ids.forEach(id=>selectedIds.delete(id));
    renderRows();
  };
  $('m-save').onclick=saveSettings;$('m-csv').onclick=csv;$('m-copy').onclick=copyPhones;
  const body=$('m-body');
  body.addEventListener('change',async ev=>{
    const target=ev.target;
    if(target.matches('[data-select]')){
      if(target.checked)selectedIds.add(target.value);
      else selectedIds.delete(target.value);
      syncBulkControls();
      return;
    }
    const tr=target.closest('tr[data-id]');
    if(!tr||statusBusy)return;
    if(target.matches('[data-status-row]')){
      const row=rows.find(r=>r.id===tr.dataset.id);
      if(!row||!STATUS_OPTIONS.includes(target.value))return;
      const next=target.value,old=row.status;
      if(next===old)return;
      statusBusy=true;syncBulkControls();
      const success=await patch(row.id,{status:next},target.closest('.m-state-cell'));
      statusBusy=false;
      if(success){
        renderAll();
        $('m-msg').textContent=row.name+'님의 접수상태를 '+next+'(으)로 변경했습니다.';
      }else{
        target.value=old;
        syncBulkControls();
      }
      return;
    }
    if(target.matches('[data-status]')){
      const row=rows.find(r=>r.id===tr.dataset.id);
      if(!row||!STATUS_OPTIONS.includes(target.value))return;
      const next=target.value,old=row.status;
      if(next===old)return;
      statusBusy=true;syncBulkControls();
      const success=await patch(row.id,{status:next},target.closest('.m-detail-actions'));
      statusBusy=false;
      if(success){
        renderAll();
        $('m-msg').textContent=row.name+'님의 접수상태를 '+next+'(으)로 변경했습니다.';
      }else{target.value=old;syncBulkControls()}
    }
  });
  body.addEventListener('focusout',ev=>{if(!ev.target.matches('[data-memo]'))return;const tr=ev.target.closest('tr[data-id]'),row=rows.find(x=>x.id===tr.dataset.id);const v=ev.target.value.trim();if((row.admin_memo||'')!==v)patch(row.id,{admin_memo:v},ev.target.parentElement)});
  body.addEventListener('click',async ev=>{const expand=ev.target.closest('[data-expand]');if(expand){expandedId=expandedId===expand.dataset.expand?null:expand.dataset.expand;renderRows();return}const b=ev.target.closest('[data-att]');if(!b)return;const tr=b.closest('tr'),row=rows.find(x=>x.id===tr.dataset.id),n=Number(b.dataset.att);const cur=row.attendance||[];const next=cur.includes(n)?cur.filter(x=>x!==n):cur.concat(n).sort((a,c)=>a-c);b.disabled=true;if(await patch(row.id,{attendance:next},b.closest('td'))){b.classList.toggle('on');b.setAttribute('aria-pressed',String(b.classList.contains('on')))}b.disabled=false});
}
async function loadAdmin(){
  try{
    const r=await rpc('cgma_ai_edu_2026_admin_list',{p_pin:null},true);
    if(!r.ok)throw Object.assign(new Error(r.error),{code:r.error});
    rows=r.rows;settings=r.settings;
    const available=new Set(rows.map(row=>row.id));
    for(const id of selectedIds)if(!available.has(id))selectedIds.delete(id);
    renderAll();$('m-msg').textContent='갱신 '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
    return true;
  }catch(e){if(panel.innerHTML)$('m-msg').textContent='불러오지 못했습니다. 다시 로그인하거나 새로고침해 주세요.';return false}
}
function renderAll(){
  const cnt=s=>rows.filter(r=>r.status===s).length,act=rows.filter(r=>r.status!=='취소').length,seat=cnt('접수')+cnt('확정');
  $('m-tiles').innerHTML=[['유효 신청',act],['확정',cnt('확정')],['접수',cnt('접수')],['대기',cnt('대기')],['남은 자리',Math.max(0,settings.capacity-seat)+' / '+settings.capacity],['취소',cnt('취소')]].map(([k,v])=>`<div class="tile"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  $('m-cap').value=settings.capacity;$('m-open').checked=settings.is_open;renderRows();
}
function filtered(){const q=digits($('m-q').value)||$('m-q').value.trim().toLowerCase(),st=$('m-st').value;return rows.filter(r=>(!st||r.status===st)&&(!q||(r.name+r.store_name+r.phone+r.receipt_no+r.business_type).toLowerCase().includes(q)))}
function syncBulkControls(){
  const active=selectedIds.size,visible=filtered();
  const count=$('m-selected-count'),bulk=$('m-bulk-apply'),all=$('m-check-all');
  if(!count||!bulk||!all)return;
  count.textContent=active+'명 선택';
  bulk.textContent='선택 '+active+'명 변경';
  bulk.disabled=statusBusy||active===0||!STATUS_OPTIONS.includes($('m-bulk-status').value);
  $('m-bulk-status').disabled=statusBusy;
  $('m-select-visible').disabled=statusBusy||visible.length===0;
  $('m-clear-selection').disabled=statusBusy||active===0;
  all.disabled=statusBusy||visible.length===0;
  all.checked=visible.length>0&&visible.every(r=>selectedIds.has(r.id));
  all.indeterminate=!all.checked&&visible.some(r=>selectedIds.has(r.id));
  panel.querySelectorAll('[data-status-row],[data-status],[data-select]').forEach(x=>{x.disabled=statusBusy});
}
async function bulkUpdateStatus(){
  const status=$('m-bulk-status').value;
  const ids=[...selectedIds].filter(id=>rows.some(row=>row.id===id));
  if(statusBusy||!STATUS_OPTIONS.includes(status)||ids.length===0)return;
  if(ids.length>100){
    $('m-msg').textContent='한 번에 최대 100명까지 선택할 수 있습니다.';return;
  }
  if(!window.confirm(ids.length+'명의 접수상태를 모두 ['+status+'](으)로 변경하시겠습니까?'))return;
  statusBusy=true;syncBulkControls();
  $('m-msg').textContent=ids.length+'명의 접수상태를 변경하는 중…';
  try{
    const result=await rpc('cgma_ai_edu_2026_admin_bulk_status',{p_pin:null,p_ids:ids,p_status:status},true);
    if(!result?.ok)throw new Error(result?.error||'unavailable');
    selectedIds.clear();
    $('m-bulk-status').value='';
    statusBusy=false;
    const reloaded=await loadAdmin();
    $('m-msg').textContent=ids.length+'명 일괄 변경 완료 (실제 상태 변경 '+result.changed+'명).'+(reloaded?'':' 목록 새로고침이 필요합니다.');
  }catch(error){
    statusBusy=false;
    $('m-msg').textContent='일괄 변경 실패: 저장되지 않았습니다. 권한과 접수상태를 확인하고 다시 시도해 주세요.';
    syncBulkControls();
  }
}
function renderRows(){
  const list=filtered();
  $('m-body').innerHTML=list.map(r=>{
    const d=new Date(r.created_at),when=(d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
    const open=expandedId===r.id;
    const id=esc(r.id);
    const stateOptions=STATUS_OPTIONS.map(v=>'<option'+(v===r.status?' selected':'')+'>'+v+'</option>').join('');
    const summary='<tr class="m-summary'+(r.status==='취소'?' cancelled':'')+'" data-id="'+id+'">'+
      '<td><input type="checkbox" data-select value="'+id+'" aria-label="'+esc(r.name)+' 선택"'+(selectedIds.has(r.id)?' checked':'')+(statusBusy?' disabled':'')+'></td>'+
      '<td><button type="button" class="m-name" data-expand="'+id+'" aria-expanded="'+open+'" aria-controls="m-detail-'+id+'"><b>'+esc(r.name)+'</b><small>'+esc(r.store_name)+' · '+esc(r.role)+'</small></button></td>'+
      '<td><span class="m-date">'+esc(when)+'</span></td>'+
      '<td class="m-state-cell"><select data-status-row aria-label="'+esc(r.name)+' 접수상태 변경"'+(statusBusy?' disabled':'')+'>'+stateOptions+'</select><small class="saved" aria-live="polite"></small></td>'+
      '<td><button class="m-expand" type="button" data-expand="'+id+'" aria-expanded="'+open+'" aria-controls="m-detail-'+id+'">'+(open?'접기 ▲':'자세히 ▼')+'</button></td></tr>';
    if(!open)return summary;
    const att=SESSIONS.map(([n,dd])=>{
      const on=(r.attendance||[]).includes(n),can=(r.available_sessions||[]).includes(n);
      return '<button type="button" data-att="'+n+'" class="'+(on?'on ':'')+(can?'can':'')+'" aria-pressed="'+on+'" title="'+n+'회 '+dd+(can?' · 참석 가능':'')+'">'+n+'</button>';
    }).join('');
    const details='<tr class="m-detail" data-id="'+id+'"><td colspan="5"><section id="m-detail-'+id+'" class="m-detail-card" aria-label="'+esc(r.name)+' 신청 상세">'+
      '<div class="m-detail-top"><strong>접수번호 '+esc(r.receipt_no)+'</strong><span>신청 '+esc(new Date(r.created_at).toLocaleString('ko-KR'))+'</span></div>'+
      '<div class="m-detail-grid">'+
      '<div><small>연락처</small><b>'+esc(fmtPhone(r.phone))+'</b></div>'+
      '<div><small>업종</small><b>'+esc(r.business_type)+'</b></div>'+
      '<div><small>휴대폰 · AI 활용 경험</small><b>'+esc(r.phone_os)+' · '+esc(r.ai_level)+'</b></div>'+
      '<div><small>촬영 동의</small><b>'+(r.consent_photo?'동의':'미동의')+'</b></div>'+
      '<div><small>희망 교육</small><p>'+(r.interests||[]).map(i=>'<span class="t">'+esc(i)+'</span>').join('')+'</p></div>'+
      '<div><small>참석 가능 회차</small><b>'+esc((r.available_sessions||[]).join(', ')||'미선택')+'</b></div>'+
      '<div class="m-detail-wide"><small>추가 요청사항</small><p>'+esc(r.needs||'없음')+'</p></div>'+
      '</div>'+
      '<div class="m-detail-actions"><label>접수 상태 <select data-status aria-label="상태">'+['접수','확정','대기','취소'].map(v=>'<option'+(v===r.status?' selected':'')+'>'+v+'</option>').join('')+'</select></label><span class="saved"></span></div>'+
      '<div class="m-detail-actions"><span>출석 (1–8회)</span><div class="att">'+att+'</div><span class="saved"></span></div>'+
      '<label class="m-note">관리자 메모<textarea class="memo" data-memo rows="2" maxlength="1000">'+esc(r.admin_memo||'')+'</textarea><span class="saved"></span></label>'+
      '</section></td></tr>';
    return summary+details;
  }).join('')||'<tr><td colspan="5">해당하는 신청자가 없습니다.</td></tr>';
  syncBulkControls();
}
async function patch(id,p,cell){
  const tag=cell.querySelector('.saved');tag.textContent='저장 중…';tag.style.color='';
  try{const r=await rpc('cgma_ai_edu_2026_admin_update',{p_pin:null,p_id:id,p_patch:p},true);if(!r.ok)throw new Error(r.error);Object.assign(rows.find(x=>x.id===id),p);tag.textContent='저장됨';setTimeout(()=>{tag.textContent=''},1500);return true}
  catch(e){tag.textContent=['login_required','denied','locked'].includes(e.message)?'권한 오류 — 다시 로그인':'저장 실패 — 다시 시도';tag.style.color='var(--danger)';return false}
}
async function saveSettings(){
  const cap=parseInt($('m-cap').value,10),msg=$('m-msg');
  if(!(cap>=1&&cap<=200)){msg.textContent='정원은 1~200 사이 숫자로 적어 주세요.';return}
  try{const r=await rpc('cgma_ai_edu_2026_admin_update',{p_pin:null,p_id:null,p_patch:{capacity:cap,is_open:$('m-open').checked}},true);if(!r.ok)throw new Error(r.error);settings={capacity:cap,is_open:$('m-open').checked};msg.textContent='설정을 저장했습니다.';renderAll()}
  catch{msg.textContent='설정을 저장하지 못했습니다.'}
}
function csv(){
  const head=['접수번호','신청일시','성명','구분','상호명','업종','휴대폰','상태','휴대폰기종','AI경험','관심분야','참석가능회차','출석회차','출석수','촬영동의','요청사항','메모'];
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const lines=filtered().map(r=>[r.receipt_no,new Date(r.created_at).toLocaleString('ko-KR'),r.name,r.role,r.store_name,r.business_type,fmtPhone(r.phone),r.status,r.phone_os,r.ai_level,(r.interests||[]).join(', '),(r.available_sessions||[]).join(','),(r.attendance||[]).join(','),(r.attendance||[]).length,r.consent_photo?'동의':'',r.needs,r.admin_memo].map(q).join(','));
  const blob=new Blob(['﻿'+[head.map(q).join(',')].concat(lines).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='청계면_AI교육_신청현황_'+new Date().toISOString().slice(0,10)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
async function copyPhones(){
  const list=rows.filter(r=>r.status==='확정').map(r=>fmtPhone(r.phone)).join(', '),msg=$('m-msg');
  if(!list){msg.textContent='확정된 신청자가 아직 없습니다.';return}
  try{await navigator.clipboard.writeText(list);msg.textContent=`확정자 번호 ${list.split(',').length}개를 복사했습니다.`}catch{msg.textContent=list}
}

async function hasScopedRosterAccess(){
  // A Google identity is handed back by EKODI auth as a verified Supabase session.
  // Do not grant any site-admin privileges; only the roster RPC may authorize access.
  if(!P.token?.())return false;
  try{
    const result=await rpc('cgma_ai_edu_2026_admin_list',{p_pin:null},true);
    if(result?.ok!==true)return false;
    rows=Array.isArray(result.rows)?result.rows:[];
    settings=result.settings||settings;
    return true;
  }catch{return false}
}
(async()=>{
  admin=await P.isAdmin();
  if(admin){
    showSignedInHeader();
    panelShell();
    panel.hidden=false;
    if(await loadAdmin()){
      document.documentElement.classList.add('cgma-can-manage');
      if(location.hash==='#manage')panel.scrollIntoView({block:'start'});
      setInterval(()=>{if(!panel.contains(document.activeElement))loadAdmin()},60000);
    }else{
      $('m-msg').textContent='관리자 권한은 확인되었지만 신청현황을 불러오지 못했습니다. [새로고침]으로 다시 시도해 주세요.';
    }
  }else if(await hasScopedRosterAccess()){
    showSignedInHeader();
    // This login is accepted only by the education roster. Do not add cgma-can-manage.
    panelShell();
    panel.hidden=false;
    renderAll();
    $('m-msg').textContent='상인 AI 교육 신청현황 전용 권한으로 접속했습니다.';
    if(location.hash==='#manage')panel.scrollIntoView({block:'start'});
    setInterval(()=>{if(!panel.contains(document.activeElement))loadAdmin()},60000);
  }else{
    panel.hidden=false;
    const notice=P.authError?.()||'이 교육의 신청현황을 관리하려면 지정된 Google 계정으로 로그인하세요. 다른 상인회 관리자 권한은 부여되지 않습니다.';
    panel.innerHTML=`<div class="manager-gate"><h2>관리자 인증이 필요합니다</h2><p class="msg" role="status">${esc(notice)}</p><a class="cgp-go" href="${esc(P.loginUrl())}">지정된 Google 계정으로 로그인 →</a></div>`;
  }
})();
})();
