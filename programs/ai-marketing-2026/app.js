// 상인 AI 마케팅 교육(2026.11.6~12.18) 참가 신청 + 같은 화면 신청현황 관리.
// 원본: Supabase cgma_ai_edu_2026_* (RLS 직접접근 차단, security definer RPC만).
// 관리 패널은 DB가 상인회 관리자 로그인(JWT)을 확인한 경우에만 열린다.
(()=>{
'use strict';
const P=window.CGMA_PROGRAMS;
const $=id=>document.getElementById(id);
const esc=P.esc;
const SESSIONS=[[1,'11/6 금'],[2,'11/13 금'],[3,'11/20 금'],[4,'11/25 수'],[5,'11/27 금'],[6,'12/4 금'],[7,'12/11 금'],[8,'12/18 금']];
const INTERESTS=['사진·이미지','숏폼 영상','영상 편집','홍보문구','인스타그램','네이버 플레이스','리뷰 답글','예약·톡톡'];
const digits=v=>String(v||'').replace(/\D/g,'');
const fmtPhone=v=>{const d=digits(v).slice(0,11);if(d.length<4)return d;if(d.length<8)return d.slice(0,3)+'-'+d.slice(3);return d.slice(0,3)+'-'+d.slice(3,d.length-4)+'-'+d.slice(-4)};
const rpc=(fn,body,auth)=>P.rpc(fn,body,{auth});

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
    $('done').hidden=false;$('done').focus();loadSeats();if(admin)loadAdmin();
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

/* ---------- 같은 화면 신청현황 관리 (상인회 관리자) ---------- */
const panel=$('manage');let admin=false,rows=[],settings={capacity:15,is_open:true};
function panelShell(){
  panel.innerHTML=`<div class="row" style="justify-content:space-between"><h2>신청현황 관리 <small style="font-weight:400;font-size:13px">관리자에게만 보입니다 · 변경 이력 기록</small></h2><div class="row"><button class="btn" id="m-refresh" type="button">새로고침</button><button class="btn" id="m-csv" type="button">엑셀(CSV) 받기</button><button class="btn" id="m-copy" type="button">확정자 번호 복사</button></div></div>
  <div class="tiles" id="m-tiles"></div>
  <div class="row"><label class="row">정원 <input id="m-cap" type="number" min="1" max="200" inputmode="numeric"> 명</label><label class="row switch"><input type="checkbox" id="m-open"> 신청 받기</label><button class="btn" id="m-save" type="button">설정 저장</button></div>
  <p class="msg" id="m-msg" aria-live="polite"></p>
  <div class="row"><input id="m-q" placeholder="이름·상호·번호 검색" aria-label="검색" style="flex:1 1 200px;min-height:40px;font-size:15px"><select id="m-st" aria-label="상태 필터" style="width:auto!important"><option value="">전체 상태</option><option>접수</option><option>확정</option><option>대기</option><option>취소</option></select></div>
  <div class="wrap-table"><table><thead><tr><th>접수</th><th>신청자</th><th>연락처</th><th>상태</th><th>출석 (1–8회)</th><th>설문</th><th>메모</th></tr></thead><tbody id="m-body"></tbody></table></div>`;
  $('m-refresh').onclick=()=>loadAdmin();
  $('m-q').oninput=renderRows;$('m-st').onchange=renderRows;
  $('m-save').onclick=saveSettings;$('m-csv').onclick=csv;$('m-copy').onclick=copyPhones;
  const body=$('m-body');
  body.addEventListener('change',async ev=>{const tr=ev.target.closest('tr');if(tr&&ev.target.matches('[data-status]')&&await patch(tr.dataset.id,{status:ev.target.value},ev.target.parentElement))renderAll()});
  body.addEventListener('focusout',ev=>{if(!ev.target.matches('[data-memo]'))return;const tr=ev.target.closest('tr'),row=rows.find(x=>x.id===tr.dataset.id);const v=ev.target.value.trim();if((row.admin_memo||'')!==v)patch(row.id,{admin_memo:v},ev.target.parentElement)});
  body.addEventListener('click',async ev=>{const b=ev.target.closest('[data-att]');if(!b)return;const tr=b.closest('tr'),row=rows.find(x=>x.id===tr.dataset.id),n=Number(b.dataset.att);const cur=row.attendance||[];const next=cur.includes(n)?cur.filter(x=>x!==n):cur.concat(n).sort((a,c)=>a-c);b.disabled=true;if(await patch(row.id,{attendance:next},b.closest('td'))){b.classList.toggle('on');b.setAttribute('aria-pressed',String(b.classList.contains('on')))}b.disabled=false});
}
async function loadAdmin(){
  try{
    const r=await rpc('cgma_ai_edu_2026_admin_list',{p_pin:null},true);
    if(!r.ok)throw Object.assign(new Error(r.error),{code:r.error});
    rows=r.rows;settings=r.settings;renderAll();$('m-msg').textContent='갱신 '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
    return true;
  }catch(e){if(panel.innerHTML)$('m-msg').textContent='불러오지 못했습니다. 다시 로그인하거나 새로고침해 주세요.';return false}
}
function renderAll(){
  const cnt=s=>rows.filter(r=>r.status===s).length,act=rows.filter(r=>r.status!=='취소').length,seat=cnt('접수')+cnt('확정');
  $('m-tiles').innerHTML=[['유효 신청',act],['확정',cnt('확정')],['접수',cnt('접수')],['대기',cnt('대기')],['남은 자리',Math.max(0,settings.capacity-seat)+' / '+settings.capacity],['취소',cnt('취소')]].map(([k,v])=>`<div class="tile"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  $('m-cap').value=settings.capacity;$('m-open').checked=settings.is_open;renderRows();
}
function filtered(){const q=digits($('m-q').value)||$('m-q').value.trim().toLowerCase(),st=$('m-st').value;return rows.filter(r=>(!st||r.status===st)&&(!q||(r.name+r.store_name+r.phone+r.receipt_no+r.business_type).toLowerCase().includes(q)))}
function renderRows(){
  $('m-body').innerHTML=filtered().map(r=>{
    const d=new Date(r.created_at),when=`${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const att=SESSIONS.map(([n,dd])=>{const on=(r.attendance||[]).includes(n),can=(r.available_sessions||[]).includes(n);return `<button type="button" data-att="${n}" class="${on?'on ':''}${can?'can':''}" aria-pressed="${on}" title="${n}회 ${dd}${can?' · 참석 가능':''}">${n}</button>`}).join('');
    return `<tr data-id="${esc(r.id)}" class="${r.status==='취소'?'cancelled':''}"><td class="no">${esc(r.receipt_no)}<small>${when}</small></td>
    <td><b>${esc(r.name)}</b> <small>${esc(r.role)}</small><br><small>${esc(r.store_name)} · ${esc(r.business_type)}</small></td>
    <td class="tel">${esc(fmtPhone(r.phone))}</td>
    <td><select data-status aria-label="상태">${['접수','확정','대기','취소'].map(s=>`<option${s===r.status?' selected':''}>${s}</option>`).join('')}</select><span class="saved"></span></td>
    <td><div class="att">${att}</div><span class="saved"></span></td>
    <td class="survey">${esc(r.phone_os)} · AI ${esc(r.ai_level)}${r.consent_photo?' · 촬영동의':''}<br>${(r.interests||[]).map(i=>`<span class="t">${esc(i)}</span>`).join('')}${r.needs?`<br>“${esc(r.needs)}”`:''}</td>
    <td><textarea class="memo" data-memo rows="2" maxlength="1000" aria-label="메모">${esc(r.admin_memo||'')}</textarea><span class="saved"></span></td></tr>`;
  }).join('')||'<tr><td colspan="7">아직 신청자가 없습니다.</td></tr>';
}
async function patch(id,p,cell){
  const tag=cell.querySelector('.saved');tag.textContent='저장 중…';tag.style.color='';
  try{const r=await rpc('cgma_ai_edu_2026_admin_update',{p_pin:null,p_id:id,p_patch:p},true);if(!r.ok)throw new Error(r.error);Object.assign(rows.find(x=>x.id===id),p);tag.textContent='저장됨';setTimeout(()=>{tag.textContent=''},1500);return true}
  catch(e){tag.textContent=['login_required','denied','locked'].includes(e.message)?'권한 오류 — 다시 로그인':'저장 실패 — 다시 시도';tag.style.color='var(--danger)';return false}
}
async function saveSettings(){
  const cap=parseInt($('m-cap').value,10),msg=$('m-msg');
  if(!(cap>=1&&cap<=200)){msg.textContent='정원은 1~200 사이 숫자로 적어 주세요.';return}
  try{const r=await rpc('cgma_ai_edu_2026_admin_update',{p_pin:null,p_id:null,p_patch:{capacity:cap,is_open:$('m-open').checked}},true);if(!r.ok)throw new Error(r.error);settings={capacity:cap,is_open:$('m-open').checked};msg.textContent='설정을 저장했습니다.';renderAll();loadSeats()}
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
(async()=>{
  admin=await P.isAdmin();
  if(admin){
    panelShell();
    if(await loadAdmin()){panel.hidden=false;document.documentElement.classList.add('cgma-can-manage');if(location.hash==='#manage')panel.scrollIntoView({block:'start'});setInterval(()=>{if(!panel.contains(document.activeElement))loadAdmin()},60000)}
    else{admin=false;panel.innerHTML='';}
  }else if(location.hash==='#manage'){
    panel.hidden=false;
    panel.innerHTML=`<h2>신청현황 관리</h2><p class="msg">상인회 관리자 계정으로 로그인하면 이 화면에서 바로 신청현황을 관리할 수 있습니다.</p><div class="row"><a class="cgp-go" href="${esc(P.loginUrl())}">Google로 로그인 →</a></div>`;
  }
})();
})();
