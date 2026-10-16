(()=>{
'use strict';
const el=id=>document.getElementById(id),api=value=>{
  if(location.hostname==='cheonggye-market.pages.dev'){
    const url=new URL(value,'https://ekodi.kr');
    const mapped={'/ai-education/api/stats':'/api/ai-education-stats','/ai-education/api/share':'/api/ai-education-share'}[url.pathname];
    return mapped?mapped+url.search:value;
  }
  return window.CGMA_ROUTE?.route(value)||value;
};
const root=()=>el('educationSurveyManager');
let token='',report=null;
const say=(value)=>{const node=el('educationSurveyStatus');if(node)node.textContent=value};
const fmt=value=>Number(value||0).toLocaleString('ko-KR');
async function request(path,options={}){
  const response=await fetch(api(path),{...options,cache:'no-store',headers:{
    'Authorization':'Bearer '+token,
    ...(options.body?{'content-type':'application/json'}:{}),
    ...(options.headers||{})
  }});
  const value=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(value.error||'http_'+response.status);
  return value;
}
const div=(name,className,text)=>{
  const node=document.createElement(name);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=String(text);
  return node;
};
function renderSection(question){
  const area=div('section','survey-stat-section');
  area.append(div('h3','',question.title));
  area.append(div('p','survey-stat-hint',question.multiple?'복수응답: 합계가 100%를 넘을 수 있습니다.':'단일응답: 전체 접수 건수 대비 비율'));
  const list=div('div','survey-stat-options');
  question.options.forEach(choice=>{
    const row=div('div','survey-stat-option');
    const top=div('div','survey-stat-label');
    top.append(div('span','',choice.answer),div('strong','',fmt(choice.count)+'명 · '+fmt(choice.percent)+'%'));
    const track=div('div','survey-stat-track'),bar=div('div','survey-stat-fill');
    bar.style.width=Math.min(100,Math.max(0,Number(choice.percent)||0))+'%';
    track.append(bar);row.append(top,track);list.append(row);
  });
  area.append(list);return area;
}
function render(stats){
  report=stats;
  el('educationSurveyCount').textContent=fmt(stats.total)+'건';
  el('educationSurveyUpdated').textContent='기준: '+new Date(stats.calculated_at).toLocaleString('ko-KR');
  const panels=el('educationSurveyCharts');
  panels.replaceChildren(...stats.sections.map(renderSection),...(stats.ranked_sections||[]).map(renderSection));
  const daily=el('educationSurveyDaily');daily.replaceChildren();
  daily.append(div('strong','','최근 30일 응답 추이'));
  if(!stats.daily.length)daily.append(div('p','','아직 제출된 응답이 없습니다.'));
  for(const record of stats.daily)daily.append(div('p','',record.day+' — '+fmt(record.count)+'건'));
  const noteArea=el('educationSurveyNotes');noteArea.replaceChildren();
  noteArea.append(div('strong','','선택형 통계 외 추가 의견 (관리자 전용)'));
  if(!stats.notes?.length)noteArea.append(div('p','','등록된 추가 의견이 없습니다.'));
  else for(const note of stats.notes){
    const entry=div('p','survey-feedback',note.text);
    noteArea.append(entry);
  }
}
function exportCsv(){
  if(!report)return say('통계 데이터가 없습니다.');
  const lines=[['질문','선택지','응답 수','비율(%)'],...[...report.sections,...(report.ranked_sections||[])].flatMap(q=>q.options.map(o=>[q.title,o.answer,o.count,o.percent]))];
  const csv='\ufeff'+lines.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='cgma-ai-education-aggregates.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  say('개별 개인정보 없는 집계표 CSV를 저장했습니다.');
}
function copySummary(){
  if(!report)return say('통계 데이터가 없습니다.');
  const content=['청계면상인회 AI 교육 수요조사','총 응답 '+fmt(report.total)+'건',...[...report.sections,...(report.ranked_sections||[])].map(q=>
    q.title+': '+q.options.filter(x=>x.count>0).map(x=>x.answer+' '+x.count+'명 ('+x.percent+'%)').join(', ')
  )].join('\n');
  navigator.clipboard.writeText(content).then(()=>say('익명 통계 요약을 복사했습니다.')).catch(()=>say('복사 권한이 없습니다. CSV로 내보내 주세요.'));
}
async function toggleContacts(){
  const area=el('educationSurveyContacts');
  if(!area)return;
  if(!area.hidden){area.hidden=true;area.replaceChildren();return}
  area.hidden=false;
  area.textContent='안내 신청 연락처를 조회하고 있습니다.';
  try{
    const data=await request('/ai-education/api/stats?contacts=1');
    area.replaceChildren();
    area.append(div('strong','','교육정보 안내를 별도로 신청한 연락처 (최대 300건)'));
    if(!data.contacts?.length){area.append(div('p','','교육정보 안내 신청자가 없습니다.'));return}
    for(const item of data.contacts){
      const line=div('p','survey-feedback');
      line.append(div('strong','',item.phone),div('span','', ' · 동의: '+item.consent_at+' · 보관 기한: '+item.expires_at));
      area.append(line);
    }
  }catch(error){area.textContent='연락처 조회 실패: '+error.message}
}
async function loadShares(){
  const data=await request('/ai-education/api/share');const area=el('educationSurveyShares');area.replaceChildren();
  const active=data.items||[];
  if(!active.length){area.append(div('p','','발급된 공유 링크가 없습니다.'));return}
  for(const share of active){
    const line=div('div','survey-share-row'),expired=share.revoked_at||Date.parse(share.expires_at.replace(' ','T')+'Z')<Date.now();
    line.append(div('span','',share.created_at+' 발급 · '+share.expires_at+' 만료 '+(share.revoked_at?'(해제됨)':expired?'(만료됨)':'')));
    if(!expired){
      const button=div('button','','공유 취소');button.type='button';button.className='survey-secondary';
      button.addEventListener('click',async()=>{
        if(!confirm('이 통계 공유 링크를 비활성화할까요?'))return;
        try{await request('/ai-education/api/share',{method:'DELETE',body:JSON.stringify({id:share.id})});say('공유 링크를 비활성화했습니다.');await loadShares()}
        catch(e){say('공유 취소 오류: '+e.message)}
      });
      line.append(button);
    }
    area.append(line);
  }
}
async function load(){
  if(!token)return;
  say('실제 수집된 응답을 집계하고 있습니다.');
  try{
    const stats=await request('/ai-education/api/stats');
    render(stats);await loadShares();
    say('청계면상인회 D1 저장소 기준 실제 응답 '+fmt(stats.total)+'건을 불러왔습니다.');
  }catch(error){say('통계를 조회할 수 없습니다: '+error.message)}
}
async function makeShare(){
  if(!token)return;
  if(!confirm('7일 동안 유효한 익명 집계 공유 링크를 생성할까요? 응답이 5건 미만이면 항목별 수치를 공개하지 않습니다.'))return;
  say('공유 링크를 만들고 있습니다.');
  try{
    const item=await request('/ai-education/api/share',{method:'POST',body:JSON.stringify({action:'create'})});
    el('educationSurveyShareLink').value=item.share.url;
    const link=el('educationSurveyShareLink');link.hidden=false;link.select();
    await navigator.clipboard.writeText(item.share.url).catch(()=>{});
    say('7일 유효 통계 공유 링크를 생성했습니다. 링크 입력란에서 복사해 공유할 수 있습니다.');
    await loadShares();
  }catch(e){say('공유 링크 생성 실패: '+e.message)}
}
function start(session){
  token=String(session?.access_token||'');
  if(!token||!root())return;
  // The panel is hidden in public HTML until the existing server-verified
  // CGMA admin session calls start(). Dashboard tabs then control visibility.
  root().hidden=false;
  const style=document.createElement('style');
  style.textContent='.survey-stat-columns{display:grid;grid-template-columns:repeat(auto-fit,minmax(255px,1fr));gap:12px}.survey-stat-section{border:1px solid #ccc;border-radius:8px;padding:12px;background:#fff}.survey-stat-section h3{margin:0;font-size:1rem}.survey-stat-hint{font-size:.76rem;color:#555;margin:4px 0}.survey-stat-option{margin:9px 0}.survey-stat-label{display:flex;justify-content:space-between;gap:8px;font-size:.83rem}.survey-stat-label strong{white-space:nowrap}.survey-stat-track{height:7px;background:#eee;border-radius:9px;overflow:hidden}.survey-stat-fill{height:7px;background:#111}.survey-share-row{display:flex;gap:12px;align-items:center;justify-content:space-between;border-bottom:1px solid #ddd;padding:8px 0}.survey-share-row span{font-size:.85rem}.survey-secondary{padding:6px 10px;background:white;border:1px solid #111;border-radius:6px;color:#111}.survey-feedback{border-bottom:1px solid #ddd;padding:6px 0;white-space:pre-wrap}#educationSurveyShareLink{width:100%;padding:10px}';
  document.head.append(style);
  el('educationSurveyRefresh')?.addEventListener('click',load);
  el('educationSurveyCsv')?.addEventListener('click',exportCsv);
  el('educationSurveyCopy')?.addEventListener('click',copySummary);
  el('educationSurveyShare')?.addEventListener('click',makeShare);
  el('educationSurveyContactsToggle')?.addEventListener('click',toggleContacts);
  load();
}
window.CGMA_EDUCATION_SURVEY_ADMIN=Object.freeze({start,refresh:load});
})();
