// 상인 AI 마케팅 교육 — 회차 일정(공용). 공개 신청 화면과 신청현황 관리 화면이 함께 씁니다.
// 원본은 Supabase cgma_ai_edu_2026_settings.sessions 이며, 아래 DEFAULT는 서버 응답이
// 없을 때만 쓰는 대비값입니다. 회차 번호(1~8)는 고정이고 날짜·시간·주제만 바뀝니다.
(()=>{
'use strict';
const DAYS=['일','월','화','수','목','금','토'];
const DEFAULT=[
  {no:1,date:'2026-11-13',start:'14:00',end:'16:00',title:'휴대폰 AI 시작하기',detail:'AI 앱 설치 · 음성/사진 질문'},
  {no:2,date:'2026-11-20',start:'14:00',end:'16:00',title:'ChatGPT 질문법',detail:'가게 소개서 · 공지문'},
  {no:3,date:'2026-11-27',start:'14:00',end:'16:00',title:'홍보 전략 · AI 홍보문구',detail:'타깃 고객 카드 · 문구 3종'},
  {no:4,date:'2026-12-04',start:'14:00',end:'16:00',title:'AI 상품 사진 · 홍보 이미지',detail:'상품 사진 3장 · 포스터 1장'},
  {no:5,date:'2026-12-11',start:'14:00',end:'16:00',title:'숏폼 기획 · 촬영',detail:'15초 숏폼 초안'},
  {no:6,date:'2026-12-18',start:'14:00',end:'16:00',title:'자막 · 음성 · 편집 완성',detail:'숏폼 1편 게시'},
  {no:7,date:'2026-12-25',start:'14:00',end:'16:00',title:'인스타 · 플레이스 · 리뷰',detail:'게시물 · 소식 · 리뷰 답글'},
  {no:8,date:'2027-01-01',start:'14:00',end:'16:00',title:'판매 · 예약 · 실행계획',detail:'4주 실행계획 · 수료 발표'}
];
const BASIC=new Set([1,2]);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const parse=d=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(d||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null};
function normalize(list){
  if(!Array.isArray(list)||list.length!==8)return DEFAULT.map(s=>({...s}));
  const byNo=new Map(list.map(s=>[Number(s&&s.no),s]));
  return DEFAULT.map(d=>{const s=byNo.get(d.no)||{};return {no:d.no,date:parse(s.date)?s.date:d.date,start:s.start||d.start,end:s.end||d.end,title:s.title||d.title,detail:s.detail??d.detail}});
}
function label(s){const d=parse(s.date);return d?(d.getMonth()+1)+'/'+d.getDate()+' '+DAYS[d.getDay()]:''}
function longLabel(s){const d=parse(s.date);return d?(d.getMonth()+1)+'월 '+d.getDate()+'일('+DAYS[d.getDay()]+')':''}
function hm(t){const [h,m]=String(t).split(':').map(Number);return {ap:h<12?'오전':'오후',n:(h%12||12)+(m?':'+String(m).padStart(2,'0'):'')}}
function timeText(s){const a=hm(s.start),b=hm(s.end);return a.ap===b.ap?a.ap+' '+a.n+'~'+b.n+'시':a.ap+' '+a.n+'시~'+b.ap+' '+b.n+'시'}
function uniformTime(list){const t=new Set(list.map(timeText));return t.size===1?[...t][0]:''}
function weekdayText(list){const w=new Set(list.map(s=>parse(s.date)?.getDay()));return w.size===1?'매주 '+DAYS[[...w][0]]:''}
function period(list){const a=parse(list[0].date),b=parse(list[list.length-1].date);if(!a||!b)return '';
  const f=d=>(d.getMonth()+1)+'.'+d.getDate(),w=weekdayText(list);return f(a)+' – '+f(b)+(w?' · '+w:'')+' · '+list.length+'회'}
function today(){const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate())}
function state(s){const d=parse(s.date);if(!d)return '';const t=today();return d<t?'done':(+d===+t?'today':'')}
function renderPlan(ol,list){
  if(!ol)return;
  const same=uniformTime(list);
  ol.innerHTML=list.map((s,i)=>{const st=state(s);
    return '<li class="'+(BASIC.has(s.no)?'basic ':'')+(st?'is-'+st:'')+'"><span class="wk">'+(i+1)+'주</span><span class="dt">'+esc(label(s))+'</span><b>'+esc(s.title)+(st==='today'?' <em class="tag-today">오늘</em>':'')+'</b><small>'+esc(s.detail)+(same?'':' · '+esc(timeText(s)))+'</small></li>'}).join('');
}
const HOLIDAYS={'2026-12-25':'성탄절','2027-01-01':'신정','2026-10-03':'개천절','2026-10-09':'한글날','2027-02-06':'설날 연휴','2027-02-07':'설날','2027-02-08':'설날 연휴','2027-02-09':'대체공휴일','2027-03-01':'삼일절'};
// In-place editor. onSave(sessions,note) must resolve to {sessions,schedule_note} or throw.
function editor(host,{sessions,note,onSave,onDone}){
  const list=normalize(sessions);
  host.innerHTML='<form class="sched-editor" novalidate aria-label="교육 일정 수정">'+
    '<div class="sched-bar"><span class="sched-bar-title">일정 수정</span>'+
    '<button type="button" class="btn sm" data-shift="-7">◀ 1주 당기기</button><button type="button" class="btn sm" data-shift="7">1주 미루기 ▶</button>'+
    '<span class="sched-bar-time">시간 일괄 <input type="time" data-all-start value="'+esc(list[0].start)+'" aria-label="일괄 시작">~<input type="time" data-all-end value="'+esc(list[0].end)+'" aria-label="일괄 종료"><button type="button" class="btn sm" data-apply-time>적용</button></span></div>'+
    '<div class="sched-grid" role="table" aria-label="회차별 일정"><div class="sched-head" role="row"><span>회</span><span>날짜</span><span>시간</span><span>주제</span><span>실습 결과물</span></div>'+
    list.map(s=>'<div class="sched-row" role="row" data-no="'+s.no+'"><b class="sched-no">'+s.no+'</b>'+
      '<span class="sched-date"><input type="date" name="date" required value="'+esc(s.date)+'" aria-label="'+s.no+'회 날짜"><small class="sched-dow"></small></span>'+
      '<span class="sched-time"><input type="time" name="start" required value="'+esc(s.start)+'" aria-label="'+s.no+'회 시작">~<input type="time" name="end" required value="'+esc(s.end)+'" aria-label="'+s.no+'회 종료"></span>'+
      '<input name="title" maxlength="60" required value="'+esc(s.title)+'" aria-label="'+s.no+'회 주제">'+
      '<input name="detail" maxlength="120" value="'+esc(s.detail)+'" aria-label="'+s.no+'회 실습 결과물"></div>').join('')+'</div>'+
    '<label class="sched-note"><span>안내 문구</span><input name="note" maxlength="300" value="'+esc(note||'')+'"></label>'+
    '<div class="sched-actions"><p class="sched-msg" role="status" aria-live="polite">회차 번호는 유지되어 참석 가능 회차·출석이 새 날짜에 그대로 연결됩니다.</p><button type="button" class="btn sm" data-cancel>닫기</button><button type="submit" class="btn primary">일정 저장</button></div></form>';
  const form=host.querySelector('form'),msg=host.querySelector('.sched-msg');
  const rowsEl=()=>[...form.querySelectorAll('.sched-row')];
  const syncDow=()=>rowsEl().forEach(r=>{const v=r.querySelector('[name=date]').value,d=parse(v);const el=r.querySelector('.sched-dow');el.textContent=d?DAYS[d.getDay()]+(HOLIDAYS[v]?' '+HOLIDAYS[v]:''):'';el.title=HOLIDAYS[v]?HOLIDAYS[v]+'(공휴일)':'';el.classList.toggle('holiday',!!HOLIDAYS[v]);r.classList.toggle('is-holiday',!!HOLIDAYS[v])});
  syncDow();form.addEventListener('input',e=>{if(e.target.name==='date')syncDow()});
  form.querySelectorAll('[data-shift]').forEach(b=>b.addEventListener('click',()=>{const k=+b.dataset.shift;
    rowsEl().forEach(r=>{const i=r.querySelector('[name=date]'),d=parse(i.value);if(!d)return;d.setDate(d.getDate()+k);i.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')});
    syncDow();msg.textContent=(k>0?'모든 회차를 1주 미뤘습니다':'모든 회차를 1주 당겼습니다')+'. 확인 후 [일정 저장]을 누르세요.'}));
  form.querySelector('[data-apply-time]').addEventListener('click',()=>{const a=form.querySelector('[data-all-start]').value,b=form.querySelector('[data-all-end]').value;rowsEl().forEach(r=>{r.querySelector('[name=start]').value=a;r.querySelector('[name=end]').value=b});msg.textContent='모든 회차 시간을 바꿨습니다. [일정 저장]을 눌러야 반영됩니다.'});
  form.querySelector('[data-cancel]').addEventListener('click',()=>{host.innerHTML='';onDone&&onDone(null)});
  form.querySelector('[name=title]').focus({preventScroll:true});
  form.addEventListener('submit',async e=>{e.preventDefault();
    const next=rowsEl().map(r=>({no:+r.dataset.no,date:r.querySelector('[name=date]').value,start:r.querySelector('[name=start]').value,end:r.querySelector('[name=end]').value,title:r.querySelector('[name=title]').value.trim(),detail:r.querySelector('[name=detail]').value.trim()}));
    for(const s of next){
      if(!parse(s.date))return void(msg.textContent=s.no+'회 날짜를 입력해 주세요.');
      if(!s.start||!s.end||s.end<=s.start)return void(msg.textContent=s.no+'회 종료 시간이 시작 시간보다 늦어야 합니다.');
      if(!s.title)return void(msg.textContent=s.no+'회 주제를 입력해 주세요.');
    }
    for(let i=1;i<next.length;i++)if(next[i].date<next[i-1].date)return void(msg.textContent=(i+1)+'회 날짜가 '+i+'회보다 빠릅니다. 회차 순서대로 날짜를 맞춰 주세요.');
    const btn=form.querySelector('[type=submit]');btn.disabled=true;msg.textContent='저장 중…';
    try{const r=await onSave(next,form.elements.note.value);msg.textContent='저장했습니다. 신청 화면과 행사 목록에 반영되었습니다.';onDone&&onDone(r)}
    catch(err){msg.textContent=({login_required:'로그인이 필요합니다.',denied:'일정 수정 권한이 없습니다.',pin_required:'일정 수정 권한이 없습니다.',invalid_date:'날짜를 확인해 주세요.',invalid_time:'시간을 확인해 주세요.',order:'회차 순서대로 날짜를 맞춰 주세요.'})[err&&err.message]||'저장하지 못했습니다. 다시 시도해 주세요.'}
    finally{btn.disabled=false}
  });
}
window.CGMA_AIEDU_SCHEDULE={DEFAULT,normalize,label,longLabel,timeText,uniformTime,weekdayText,period,renderPlan,editor,HOLIDAYS};
})();
