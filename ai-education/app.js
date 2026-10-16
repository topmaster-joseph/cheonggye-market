import {SURVEY_QUESTIONS,SURVEY_VERSION} from './questions.mjs';
'use strict';
// Keep the existing gateway's exact script identity marker.
const questions = [...SURVEY_QUESTIONS];
const form=document.getElementById('survey'),container=document.getElementById('questions');
const result=document.getElementById('result'),saveButton=document.getElementById('submit'),exportButton=document.getElementById('export');
const responses={};let last=null;
const noticeOptIn=document.getElementById('noticeOptIn');
const noticeDetails=document.getElementById('noticeDetails');
const noticePhone=document.getElementById('noticePhone');
const noticeConsent=document.getElementById('noticeConsent');
noticeOptIn.addEventListener('change',()=>{
  noticeDetails.hidden=!noticeOptIn.checked;
  noticePhone.required=noticeOptIn.checked;
  noticeConsent.required=noticeOptIn.checked;
  if(!noticeOptIn.checked){noticePhone.value='';noticeConsent.checked=false;}
});
if(location.hostname==='cheonggye-market.pages.dev'){
  const homepage=document.querySelector('header a');
  if(homepage)homepage.href='../';
}
const adminStatsLink=document.getElementById('adminStatsLink');
if(adminStatsLink)adminStatsLink.href='?manage=educationSurveyManager';
for(let i=0;i<questions.length;i++){
  const question=questions[i],fieldset=document.createElement('fieldset'),legend=document.createElement('legend');
  legend.textContent=(i+1)+'. '+question.title+(question.multiple?' (복수 선택 가능)':' (1개 선택)');
  fieldset.append(legend);
  const grid=document.createElement('div');grid.className='option-grid';
  for(const option of question.options){
    const label=document.createElement('label');label.className='option';
    const input=document.createElement('input');
    input.type=question.multiple?'checkbox':'radio';input.name=question.key;input.value=option;
    input.required=!question.multiple;
    label.append(input,document.createTextNode(option));grid.append(label);
  }
  fieldset.append(grid);container.append(fieldset);
}
const keyName='cgma_ai_education_response_key_v2';
function randomResponseKey(){
  const bits=new Uint8Array(16);crypto.getRandomValues(bits);
  return [...bits].map(n=>n.toString(16).padStart(2,'0')).join('');
}
let responseKey;
try{
  responseKey=localStorage.getItem(keyName);
  if(!/^[a-f0-9]{32}$/.test(responseKey||'')){responseKey=randomResponseKey();localStorage.setItem(keyName,responseKey)}
 }catch{responseKey=randomResponseKey()}
const noticeKeyName='cgma_ai_education_notice_key_v1';
let noticeKey;
try{
  noticeKey=localStorage.getItem(noticeKeyName);
  if(!/^[a-f0-9]{32}$/.test(noticeKey||'')){noticeKey=randomResponseKey();localStorage.setItem(noticeKeyName,noticeKey)}
}catch{noticeKey=randomResponseKey()}
function show(text,error=false){
  result.hidden=false;result.dataset.state=error?'error':'success';result.textContent=text;
  result.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function answersFromForm(){
  const answers={};
  for(const question of questions){
    const selected=Array.from(form.querySelectorAll('input[name="'+question.key+'"]:checked'),input=>input.value);
    if(!selected.length)return {error:'"'+question.title+'" 항목을 선택해주세요.'};
    if(!question.multiple&&selected.length!==1)return {error:'"'+question.title+'" 항목은 1개만 선택해주세요.'};
    answers[question.key]=question.multiple?selected:selected[0];
  }
  if(!answers.topics.includes(answers.priority))return {error:'가장 먼저 배우고 싶은 교육은 선택한 교육 내용에도 포함해주세요.'};
  if(answers.available_devices.includes('사용 가능한 기기 없음')&&answers.available_devices.length>1)return {error:'사용 가능한 기기가 없다면 다른 보유 기기를 선택하지 마세요.'};
  return {answers};
}
const topicToCourse={
  'ChatGPT·생성형 AI 기초':'ChatGPT·AI 입문',
  '휴대폰 AI 활용':'스마트폰 AI 실습',
  '상품 사진·홍보 이미지':'AI 홍보 이미지 만들기',
  'SNS·블로그·지도 홍보':'AI 온라인 상권 홍보',
  '숏폼·홍보영상':'AI 숏폼 홍보영상',
  '고객 응대·리뷰 관리':'AI 고객·리뷰 관리',
  '엑셀·매출·재고 분석':'AI 매장 경영 데이터',
  '온라인 판매·예약 관리':'AI 판매·예약 실무',
  '지원사업·행정 문서':'AI 문서·지원사업 활용',
  'AI 자동화·챗봇':'매장 AI 자동화'
};
function recommendedCourses(answers){
  return [answers.priority,...answers.topics.filter(x=>x!==answers.priority)]
    .map(x=>topicToCourse[x]||x).slice(0,3);
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const parsed=answersFromForm();
  if(parsed.error)return show(parsed.error,true);
  if(!document.getElementById('privacyAck').checked)return show('익명 응답 저장·통계 활용 동의가 필요합니다.',true);
  const feedback=document.getElementById('comment').value.trim();
  if(feedback.length>500)return show('추가 의견은 500자 이내로 입력해주세요.',true);
  const optedIn=noticeOptIn.checked;
  const phone=noticePhone.value.replace(/[^0-9]/g,'');
  if(optedIn&&(!/^01[016789][0-9]{7,8}$/.test(phone)))return show('안내 신청 시 올바른 휴대전화 번호를 입력해주세요.',true);
  if(optedIn&&!noticeConsent.checked)return show('교육정보 안내용 연락처 수집·이용에 동의해주세요.',true);
  saveButton.disabled=true;saveButton.textContent='응답을 저장하고 있습니다...';
  try{
    const path=location.hostname==='cheonggye-market.pages.dev'?'/api/ai-education-responses':'./api/responses';
    const response=await fetch(path,{method:'POST',cache:'no-store',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({version:SURVEY_VERSION,response_key:responseKey,answers:parsed.answers,feedback,
        privacy_ack:true,website:document.getElementById('website').value,
        notice:{opt_in:optedIn,consent:optedIn&&noticeConsent.checked,key:noticeKey,...(optedIn?{phone}:{})}})});
    const outcome=await response.json().catch(()=>({}));
    if(!response.ok||outcome.saved!==true)throw new Error(response.status===503?'서버 저장소가 일시적으로 사용할 수 없습니다.':'접수가 완료되지 않았습니다.');
    last={answers:parsed.answers,feedback};
    const recommendations=recommendedCourses(parsed.answers);
    show('설문 응답이 실제 통계에 저장되었습니다. 감사합니다.\n'+(optedIn?'교육정보 안내 신청도 접수되었습니다.\n':'')+'\n추천 교육과정\n'+recommendations.map((value,i)=>(i+1)+'. '+value).join('\n')+'\n\n다시 제출하면 같은 브라우저의 기존 응답이 갱신됩니다.');
    exportButton.hidden=false;
  }catch(error){show('응답을 저장하지 못했습니다. '+(error.message||'네트워크 연결을 확인해주세요.')+' 입력 내용은 화면에 남아 있습니다.',true)}
  finally{saveButton.disabled=false;saveButton.textContent='설문 응답 저장 및 추천 보기'}
});
exportButton.addEventListener('click',()=>{
  if(!last)return;
  const rows=[['질문','선택 응답'],...questions.map(q=>[q.title,Array.isArray(last.answers[q.key])?last.answers[q.key].join('; '):last.answers[q.key]]),['추가 의견',last.feedback]];
  const content='\ufeff'+rows.map(row=>row.map(value=>'"'+String(value||'').replaceAll('"','""')+'"').join(',')).join('\r\n');
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='cgma-ai-education-my-answers.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
