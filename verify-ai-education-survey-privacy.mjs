import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SURVEY_VERSION,SURVEY_QUESTIONS} from './ai-education/questions.mjs';
import {validateSurvey,saveNoticeContact} from './functions/_shared/ai-education-store.js';

const fields=Object.fromEntries(SURVEY_QUESTIONS.map(q=>[q.key,q.multiple?[q.options[0]]:q.options[0]]));
fields.priority=fields.topics[0];
const base={version:SURVEY_VERSION,response_key:'a'.repeat(32),privacy_ack:true,answers:fields,feedback:''};
assert.equal(validateSurvey(base).error,undefined,'legacy anonymous entries remain accepted');
const options=SURVEY_QUESTIONS.find(q=>q.key==='topics').options;
const priority=SURVEY_QUESTIONS.find(q=>q.key==='priority').options;
assert.ok(options.length>=25,'training subjects expanded');
assert.deepEqual(priority,options,'priority always matches topics');
assert.ok(options.includes('네이버플레이스·지도 관리'));
assert.ok(options.includes('매출 분석·판매 예측'));

const notice={key:'b'.repeat(32),opt_in:true,consent:true,phone:'010-1234-5678'};
const accepted=validateSurvey({...base,notice});
assert.equal(accepted.error,undefined);
assert.equal(accepted.notice.phone,'01012345678');
assert.equal(Object.hasOwn(accepted.answers,'phone'),false,'no contact data in survey answers');
assert.equal(validateSurvey({...base,notice:{...notice,consent:false}}).error,'notice_consent_required');
assert.equal(validateSurvey({...base,notice:{...notice,phone:'111'}}).error,'invalid_notice_phone');
assert.equal(validateSurvey({...base,notice:{...notice,key:base.response_key}}).error,'invalid_notice_key');
assert.equal(validateSurvey({...base,notice:{key:'b'.repeat(32),opt_in:false}}).error,undefined);
const calls=[];
const db={prepare(sql){const call={sql,values:[]};calls.push(call);return {
  bind(...values){call.values=values;return this},
  async run(){return {success:true}}
}}};
await saveNoticeContact(db,accepted.notice);
assert.match(calls[0].sql,/INSERT INTO cgma_ai_education_contacts/);
assert.equal(calls[0].values[1],'01012345678');
assert.equal(calls[0].sql.includes('cgma_ai_education_responses'),false);
await saveNoticeContact(db,{key:'b'.repeat(32),optIn:false});
assert.match(calls[1].sql,/DELETE FROM cgma_ai_education_contacts/);

const html=readFileSync(new URL('./ai-education/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('./ai-education/app.js',import.meta.url),'utf8');
const admin=readFileSync(new URL('./admin-education-survey.js',import.meta.url),'utf8');
assert.match(html,/소상공인 AI 맞춤형 교육 수요조사/);
assert.match(html,/id="noticeOptIn"/);
assert.match(html,/id="noticeConsent"/);
assert.match(html,/최장 6개월/);
assert.match(app,/notice:\{opt_in:optedIn/);
assert.match(admin,/contacts=1/);
console.log('CGMA small-business survey topic, notice consent, and storage boundary checks passed');
