import './verify-ai-education-survey-privacy.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import {SURVEY_QUESTIONS,SURVEY_VERSION} from './ai-education/questions.mjs';
import {aggregateSurvey,ensureSurveyTables,validateSurvey,saveSurvey,newShare,shareActive,revokeShare,sameSiteOrigin} from './functions/_shared/ai-education-store.js';
import {onRequestPost} from './functions/api/ai-education-responses.js';
import {onRequestGet as getStats} from './functions/api/ai-education-stats.js';
import {onRequestGet as getShare,onRequestPost as makeShare} from './functions/api/ai-education-share.js';

function memoryDB(){
  const native=new DatabaseSync(':memory:');
  return {prepare(sql){
    let params=[];
    const statement=native.prepare(sql);
    return {
      bind(...args){params=args;return this},
      run(){const r=statement.run(...params);return {success:true,meta:{changes:Number(r.changes||0)}}},
      first(){return statement.get(...params)||null},
      all(){return {results:statement.all(...params)}}
    };
  },close(){native.close()}};
}
const responses=(seed=0)=>Object.fromEntries(SURVEY_QUESTIONS.map((q,i)=>{
  const selected=q.options[(seed+i)%q.options.length];
  return [q.key,q.multiple?[selected]:selected];
}));
function payload(seed=0){
  const answers=responses(seed);
  answers.priority=answers.topics[0];
  if(answers.available_devices.includes('사용 가능한 기기 없음'))answers.available_devices=['핸드폰'];
  return {version:SURVEY_VERSION,response_key:seed.toString(16).padStart(32,'0'),privacy_ack:true,
    answers,feedback:seed===0?'연락처 없이 강의를 신청하고 싶습니다.':''};
}
const store=()=>({cheonggye_market_notices:memoryDB()});
const request=(method='POST',body=null,extra={})=>new Request('https://ekodi.kr/cgma/ai-education/api/responses',{
  method,headers:{origin:'https://ekodi.kr','content-type':'application/json',...extra},
  ...(body!==null?{body:JSON.stringify(body)}:{})
});
test('the schema provides distinct devices and venue choices without collecting identity',()=>{
  assert.equal(SURVEY_QUESTIONS.length,16);
  const byKey=new Map(SURVEY_QUESTIONS.map(q=>[q.key,q]));
  for(const item of ['컴퓨터','노트북','태블릿','핸드폰','기타'])
    assert.ok(byKey.get('preferred_devices').options.includes(item));
  for(const item of ['목포대학교','도시재생센터','상가','기타'])
    assert.ok(byKey.get('preferred_places').options.includes(item));
  assert.ok(byKey.get('available_devices').multiple);
  assert.equal(byKey.get('participation').multiple,undefined);
  for(const key of ['name','phone','email','address','business_registration'])
    assert.equal(byKey.has(key),false);
});
test('strict consent, version, options and mutually exclusive device validation',()=>{
  assert.ok(validateSurvey(payload()).answers);
  assert.equal(validateSurvey({...payload(),privacy_ack:false}).error,'survey_version_or_consent_required');
  assert.equal(validateSurvey({...payload(),version:1}).error,'survey_version_or_consent_required');
  const bad=payload();bad.answers.preferred_places=['목포대학교','그 외 무단 선택'];
  assert.equal(validateSurvey(bad).error,'invalid_preferred_places');
  const duplicate=payload();duplicate.answers.preferred_devices=['노트북','노트북'];
  assert.equal(validateSurvey(duplicate).error,'invalid_preferred_devices');
  const no=payload();no.answers.available_devices=['사용 가능한 기기 없음','노트북'];
  assert.equal(validateSurvey(no).error,'invalid_available_devices');
  const mismatch=payload();mismatch.answers.priority='해당 없음';
  assert.ok(validateSurvey(mismatch).error);
});
test('actual SQLite D1-like store deduplicates anonymous device key and stores structured answers',async()=>{
  const db=memoryDB();try{
    await ensureSurveyTables(db);
    const first=validateSurvey(payload(0));
    assert.equal(await saveSurvey(db,first),true);
    assert.equal(await saveSurvey(db,first),true);
    let stats=await aggregateSurvey(db);
    assert.equal(stats.total,1);
    assert.equal(stats.notes.length,1);
    const modified=payload(0);modified.answers.preferred_places=['도시재생센터'];
    await saveSurvey(db,validateSurvey(modified));
    stats=await aggregateSurvey(db);
    assert.equal(stats.total,1);
    const places=stats.sections.find(x=>x.key==='preferred_places');
    assert.equal(places.options.find(x=>x.answer==='도시재생센터').count,1);
    assert.equal(places.options.find(x=>x.answer==='목포대학교').count,0);
    assert.equal(stats.daily.reduce((n,x)=>n+x.count,0),1);
  }finally{db.close()}
});
test('aggregate share enforces minimum cohort, never exports notes or raw keys, and can be revoked',async()=>{
  const db=memoryDB();try{
    await ensureSurveyTables(db);
    await saveSurvey(db,validateSurvey(payload(0)));
    const hidden=await aggregateSurvey(db,{shared:true});
    assert.equal(hidden.total,1);assert.equal(hidden.suppressed,true);
    assert.equal(hidden.sections.length,0);
    for(let i=1;i<6;i++)await saveSurvey(db,validateSurvey(payload(i)));
    const publicStats=await aggregateSurvey(db,{shared:true});
    assert.equal(publicStats.total,6);
    assert.equal(publicStats.suppressed,false);
    assert.equal(publicStats.sections.find(s=>s.key==='preferred_devices').options.length,5);
    assert.equal(JSON.stringify(publicStats).includes('feedback'),false);
    assert.equal(JSON.stringify(publicStats).includes('response_key'),false);
    const share=await newShare(db);
    assert.match(share.url,/https:\/\/ekodi.kr\/cgma\/ai-education\/report\/\?token=/);
    assert.equal(await shareActive(db,share.token),true);
    assert.equal(await shareActive(db,'not-a-token'),false);
    assert.equal(await revokeShare(db,share.id),true);
    assert.equal(await shareActive(db,share.token),false);
  }finally{db.close()}
});
test('public writes require first-party browser Origin and refuse invalid content',async()=>{
  const env=store();
  try{
    const invalidOrigin=await onRequestPost({request:request('POST',payload(),{origin:'https://attacker.test'}),env});
    assert.equal(invalidOrigin.status,403);
    const invalid=await onRequestPost({request:request('POST',{...payload(),privacy_ack:false}),env});
    assert.equal(invalid.status,400);
    const good=await onRequestPost({request:request('POST',payload()),env});
    assert.equal(good.status,201);
    assert.equal((await good.json()).saved,true);
    const duplicate=await onRequestPost({request:request('POST',payload()),env});
    assert.equal(duplicate.status,201);
    const stats=await aggregateSurvey(env.cheonggye_market_notices);
    assert.equal(stats.total,1);
    assert.equal(sameSiteOrigin(request('POST',payload(),{origin:'https://evil.example'})),false);
  }finally{env.cheonggye_market_notices.close()}
});
test('admin stats and share API reject unauthenticated requests',async()=>{
  const env=store();try{
    const request=new Request('https://cheonggye-market.pages.dev/api/ai-education-stats');
    const stats=await getStats({request,env});
    assert.equal(stats.status,401);
    const share=await getShare({request,env});
    assert.equal(share.status,401);
    const create=await makeShare({request:new Request('https://cheonggye-market.pages.dev/api/ai-education-share',{
      method:'POST',headers:{origin:'https://cheonggye-market.pages.dev','content-type':'application/json'},body:'{"action":"create"}'}),env});
    assert.equal(create.status,401);
  }finally{env.cheonggye_market_notices.close()}
});
test('authorized admin obtains real aggregates and shares but unauthenticated token viewer sees only aggregates',async()=>{
  const env=store();const fetchBefore=globalThis.fetch;
  globalThis.fetch=async url=>{
    if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'test-admin',email:'tenant@example.invalid'});
    if(String(url).includes('/membership-api/pending'))return Response.json({reviewer:{authority:'tenant'}});
    return new Response('denied',{status:403});
  };
  try{
    const body=payload(0);await ensureSurveyTables(env.cheonggye_market_notices);
    await saveSurvey(env.cheonggye_market_notices,validateSurvey(body));
    const stats=await getStats({request:new Request('https://cheonggye-market.pages.dev/api/ai-education-stats',{headers:{authorization:'Bearer simulated-token'}}),env});
    assert.equal(stats.status,200);
    const data=await stats.json();
    assert.equal(data.total,1);assert.equal(data.notes.length,1);
    const shared=await makeShare({request:new Request('https://cheonggye-market.pages.dev/api/ai-education-share',{
      method:'POST',headers:{authorization:'Bearer simulated-token',origin:'https://ekodi.kr','content-type':'application/json'},
      body:'{"action":"create"}'}),env});
    assert.equal(shared.status,201);
    const created=(await shared.json()).share;
    const publicShared=await getShare({request:new Request('https://cheonggye-market.pages.dev/api/ai-education-share?token='+created.token),env});
    assert.equal(publicShared.status,200);
    const safe=await publicShared.json();
    assert.equal(safe.shared,true);assert.equal(safe.suppressed,true);
    assert.equal(Object.hasOwn(safe,'notes'),false);
  }finally{globalThis.fetch=fetchBefore;env.cheonggye_market_notices.close()}
});
test('admin integration and canonical route contain actual stats and share controls',async()=>{
  const [html,client,admin,adminJs,gateway]=await Promise.all([
    readFile(new URL('./ai-education/index.html',import.meta.url),'utf8'),
    readFile(new URL('./ai-education/app.js',import.meta.url),'utf8'),
    readFile(new URL('./admin/index.html',import.meta.url),'utf8'),
    readFile(new URL('./admin-education-survey.js',import.meta.url),'utf8'),
    readFile(new URL('./cgma-root-gateway.js',import.meta.url),'utf8')
  ]);
  for(const term of ['교육 희망 기기','교육 희망 장소','실제 접수 및 통계 반영'])assert.ok(html.includes(term));
  assert.match(client,/fetch\(path,\{method:'POST'/);
  assert.match(client,/responseKey/);
  assert.match(client,/categoryForTopic/);
  assert.match(client,/syncPriorityChoices/);
  assert.match(client,/input.parentElement.hidden=!selected.has\(input.value\)/);
  for(const term of ['educationSurveyManager','educationSurveyShare','educationSurveyCsv','CGMA_EDUCATION_SURVEY_ADMIN'])assert.ok(admin.includes(term));
  assert.ok(adminJs.includes('CGMA_EDUCATION_SURVEY_ADMIN'));
  // The public HTML keeps stats hidden until validated admin start(), then reveals them.
  assert.match(admin,/id="educationSurveyManager" hidden/);
  assert.ok(adminJs.includes('root().hidden=false'));
  for(const term of ['/api/responses','/api/stats','/api/share','questions.mjs','report/app.js'])assert.ok(gateway.includes(term));
});

test('optional education announcements require separate consent and are not shared with anonymous survey analytics',async()=>{
  const db=memoryDB();try{
    await ensureSurveyTables(db);
    const entry=payload(51);entry.notice={key:'f'.repeat(32),opt_in:true,consent:true,phone:'010-9876-5432'};
    const checked=validateSurvey(entry);
    assert.equal(checked.error,undefined);
    await saveSurvey(db,checked);
    const {saveNoticeContact,listNoticeContacts}=await import('./functions/_shared/ai-education-store.js');
    await saveNoticeContact(db,checked.notice);
    const contacts=await listNoticeContacts(db);
    assert.equal(contacts.length,1);
    assert.equal(contacts[0].phone,'01098765432');
    const anonymous=await aggregateSurvey(db,{shared:true});
    assert.equal(JSON.stringify(anonymous).includes('01098765432'),false);
    const adminAggregate=await aggregateSurvey(db);
    assert.equal(JSON.stringify(adminAggregate).includes('01098765432'),false);
    const answered=db.prepare('SELECT answers_json FROM cgma_ai_education_responses').first().answers_json;
    assert.equal(answered.includes('01098765432'),false);
    const optout=validateSurvey({...entry,notice:{key:'f'.repeat(32),opt_in:false}});
    assert.equal(optout.error,undefined);
    await saveNoticeContact(db,optout.notice);
    assert.equal((await listNoticeContacts(db)).length,0);
  }finally{db.close()}
});
