(()=>{'use strict';
const P=window.CGMA_PROGRAMS;
const $=id=>document.getElementById(id);
const gate=$('gate'),panel=$('content');
let records=[];
const login=P?.loginUrl?.()||'https://ekodi.kr/auth/?site=cgma';
$('login').href=login;$('login-top').href=login;
const mask=phone=>phone.length===11?phone.slice(0,3)+'-'+phone.slice(3,7)+'-'+phone.slice(-4):phone;
const value=x=>String(x??'');
function showStatus(message){$('status').hidden=false;$('status').textContent=message}
function render(){
  const search=$('search').value.trim().toLowerCase();
  const items=records.filter(r=>!search||[r.store_name,r.name,r.phone].some(v=>value(v).toLowerCase().includes(search)));
  $('count').textContent='· '+records.length+'건 접수';
  const tbody=$('rows');tbody.replaceChildren();
  items.forEach((r,i)=>{
    const tr=document.createElement('tr');
    [String(i+1),value(r.store_name),value(r.name),mask(value(r.phone)),
      new Date(r.created_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})].forEach((t,j)=>{
      const td=document.createElement('td');
      if(j===3){const a=document.createElement('a');a.href='tel:'+value(r.phone);a.textContent=t;td.append(a)}
      else td.textContent=t;
      tr.append(td);
    });
    tbody.append(tr);
  });
  if(!items.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=5;td.textContent='표시할 신청자가 없습니다.';tr.append(td);tbody.append(tr)}
}
async function load(){
  showStatus('신청현황을 불러오는 중입니다.');
  try{
    const data=await P.rpc('cgma_mnu_2026_admin_list',{}, {auth:true});
    if(!data?.ok)throw new Error(data?.error||'unavailable');
    records=Array.isArray(data.rows)?data.rows:[];
    $('status').hidden=true;render();
  }catch{records=[];render();showStatus('명단을 읽지 못했습니다. 다시 로그인하거나 새로고침해 주세요.')}
}
$('search').addEventListener('input',render);
$('refresh').addEventListener('click',load);
$('csv').addEventListener('click',()=>{
  const clean=v=>{
    const s=value(v);
    const safe=/^[=+\-@\t\r]/.test(s)?"'"+s:s;
    return '"'+safe.replace(/"/g,'""')+'"';
  };
  const rows=[['상호','성명','연락처','신청일시'],...records.map(r=>[r.store_name,r.name,r.phone,r.created_at])];
  const csv='\uFEFF'+rows.map(row=>row.map(clean).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='cgma-mnu-2026-applications.csv';
  document.body.append(link);link.click();link.remove();URL.revokeObjectURL(url);
});
$('logout').addEventListener('click',async()=>{
  try{await P.signOut()}catch{}
  records=[];panel.hidden=true;gate.hidden=false;$('logout').hidden=true;$('login-top').hidden=false;
  location.replace(location.pathname+location.search);
});
(async()=>{
  if(!P){gate.querySelector('p').textContent='통합 로그인 연결을 읽지 못했습니다.';return}
  await P.whenAuthReady();
  const signed=await P.currentUser().catch(()=>null);
  if(signed){$('logout').hidden=false;$('login-top').hidden=true}
  const ok=await P.isAdmin().catch(()=>false);
  if(!ok){if(signed)gate.querySelector('p').textContent='로그인되어 있지만 청계면상인회 관리자 권한이 확인되지 않았습니다.';return}
  gate.hidden=true;panel.hidden=false;await load();
})();
})();
