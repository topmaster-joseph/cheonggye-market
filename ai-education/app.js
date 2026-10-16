// Anonymous, local-only CGMA merchant AI education survey.
'use strict';
const questions = [
  ['운영 업종','음식점·카페','식품·농수산물','소매·잡화','미용·생활서비스','숙박·관광','기타'],
  ['AI 사용 경험','처음 들어봄','알지만 미사용','몇 번 사용','가끔 활용','자주 활용'],
  ['운영 중 어려운 점','신규 고객 확보','상품 홍보','온라인 판매','단골 관리','매출·재고 관리','서류·행정업무'],
  ['배우고 싶은 AI 활용','ChatGPT 기초','홍보 이미지·전단지','SNS·블로그 홍보','홍보영상 제작','고객·리뷰 관리','매출·재고·엑셀','지원사업 신청'],
  ['희망 교육 방식','스마트폰 실습','노트북 실습','업종별 소그룹','가게별 문제 해결'],
  ['희망 시간','평일 오전','평일 오후','평일 저녁','주말'],
  ['희망 교육 횟수','1회 2시간','2회 4시간','4회 8시간','정기교육']
];
const many = new Set([2,3,5]);
const container = document.getElementById('questions');
for (let i=0;i<questions.length;i++) {
  const question=questions[i];
  const field=document.createElement('fieldset');
  const legend=document.createElement('legend');
  legend.textContent=(i+1)+'. '+question[0]+(many.has(i)?' (복수 선택)':'');
  field.append(legend);
  for (const answer of question.slice(1)) {
    const label=document.createElement('label');
    const input=document.createElement('input');
    input.type=many.has(i)?'checkbox':'radio';
    input.name='q'+i;
    input.value=answer;
    input.required=!many.has(i);
    label.append(input,document.createTextNode(' '+answer));
    field.append(label);
  }
  container.append(field);
}
let last=null;
const exportButton=document.getElementById('export');
document.getElementById('survey').addEventListener('submit',event=>{
  event.preventDefault();
  const responses=questions.map((q,i)=>[q[0],Array.from(document.querySelectorAll('[name="q'+i+'"]:checked')).map(v=>v.value)]);
  if (!responses[2][1].length || !responses[3][1].length || !responses[5][1].length) {
    const el=document.getElementById('result');el.hidden=false;el.textContent='복수 선택 문항을 하나 이상 선택해주세요.';return;
  }
  const topics=responses[3][1];
  const mapping=[['ChatGPT 기초','AI 첫걸음'],['홍보 이미지·전단지','AI 홍보 디자인'],['SNS·블로그 홍보','AI 온라인 마케팅'],['홍보영상 제작','AI 홍보영상'],['고객·리뷰 관리','AI 고객관리'],['매출·재고·엑셀','AI 매장경영'],['지원사업 신청','AI 행정·지원사업']];
  const recommended=mapping.filter(item=>topics.includes(item[0])).map(item=>item[1]);
  last={responses,recommended,comment:document.getElementById('comment').value};
  const result=document.getElementById('result');
  result.hidden=false;
  result.textContent='추천 교육과정\n'+recommended.map((item,i)=>(i+1)+'. '+item).join('\n')+'\n\n※ 교육 신청이나 서버 제출은 이루어지지 않았습니다.';
  exportButton.hidden=false;
  result.scrollIntoView({behavior:'smooth'});
});
exportButton.addEventListener('click',()=>{
  if (!last)return;
  const rows=[['문항','응답'],...last.responses.map(([q,a])=>[q,a.join('; ')]),['추가 의견',last.comment],['추천 교육',last.recommended.join('; ')]];
  const content='\ufeff'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\r\n');
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download='merchant-ai-survey.csv';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
