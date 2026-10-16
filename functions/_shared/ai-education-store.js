import {SURVEY_QUESTIONS,SURVEY_VERSION} from '../../ai-education/questions.mjs';

const table='cgma_ai_education_responses';
const shareTable='cgma_ai_education_shares';
const contactsTable='cgma_ai_education_contacts';
export const MIN_PUBLIC_RESPONSES=5;
const ddl=[
  `CREATE TABLE IF NOT EXISTS ${table} (
    id TEXT PRIMARY KEY,
    response_key_hash TEXT NOT NULL UNIQUE,
    survey_version INTEGER NOT NULL,
    answers_json TEXT NOT NULL,
    feedback TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cgma_ai_education_created ON ${table}(created_at)`,
  `CREATE TABLE IF NOT EXISTS ${shareTable} (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    revoked_at TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cgma_ai_education_share_expires ON ${shareTable}(expires_at)`,
  `CREATE TABLE IF NOT EXISTS ${contactsTable} (
    contact_key_hash TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL DEFAULT (datetime('now','+6 months'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cgma_ai_education_contacts_expires ON ${contactsTable}(expires_at)`
];
export const reply=(data,status=200)=>Response.json(data,{status,headers:{
  'cache-control':'private, no-store, max-age=0',
  'x-content-type-options':'nosniff',
  'referrer-policy':'no-referrer'
}});
export async function ensureSurveyTables(db){
  if(!db?.prepare)throw new Error('survey_db_unavailable');
  for(const sql of ddl)await db.prepare(sql).run();
  await db.prepare(`DELETE FROM ${contactsTable} WHERE expires_at<=CURRENT_TIMESTAMP`).run();
}
export async function sha256(value){
  const input=new TextEncoder().encode(String(value));
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',input))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export const makeToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
const isRecord=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
// Continue to accept v2 requests during a bounded browser cache transition; do not
// reinterpret historical non-ranked topic choices as 2nd/3rd priorities.
const LEGACY_SURVEY_VERSION=2;
const legacyQuestions=SURVEY_QUESTIONS.flatMap(q=>
  q.key==='respondent_type'?[]:q.key==='topics'?[q,{key:'priority',title:'가장 먼저 배우고 싶은 교육',options:q.options}]:[q]
);
export function validateSurvey(body){
  if(!isRecord(body)||![SURVEY_VERSION,LEGACY_SURVEY_VERSION].includes(body.version)||body.privacy_ack!==true)return {error:'survey_version_or_consent_required'};
  const legacy=body.version===LEGACY_SURVEY_VERSION;
  if(typeof body.response_key!=='string'||!/^[a-f0-9]{32}$/.test(body.response_key))return {error:'invalid_response_key'};
  if(!isRecord(body.answers))return {error:'invalid_answers'};
  const answers={};
  for(const question of legacy?legacyQuestions:SURVEY_QUESTIONS){
    const submitted=body.answers[question.key];
    if(question.multiple){
      if(!Array.isArray(submitted)||submitted.length===0||submitted.length>question.options.length)return {error:'missing_or_invalid_'+question.key};
      if(submitted.some(v=>typeof v!=='string'||!question.options.includes(v))||new Set(submitted).size!==submitted.length)return {error:'invalid_'+question.key};
      if(question.key==='available_devices'&&submitted.includes('사용 가능한 기기 없음')&&submitted.length>1)return {error:'invalid_available_devices'};
      if(question.key==='difficulties'&&submitted.includes('해당 없음')&&submitted.length>1)return {error:'invalid_difficulties'};
      if(question.key==='topics'&&!legacy&&submitted.length>3)return {error:'max_three_ranked_topics'};
      answers[question.key]=[...submitted];
    }else{
      if(typeof submitted!=='string'||!question.options.includes(submitted))return {error:'missing_or_invalid_'+question.key};
      answers[question.key]=submitted;
    }
  }
  if(legacy&&!answers.topics.includes(answers.priority))return {error:'priority_must_be_in_topics'};
  if(typeof body.feedback!=='string'&&body.feedback!==undefined)return {error:'invalid_feedback'};
  const feedback=String(body.feedback||'').trim();
  if(feedback.length>500)return {error:'feedback_too_long'};
  // Contact applications have an independent key and never enter answers_json or shared statistics.
  let notice=null;
  if(body.notice!==undefined){
    if(!isRecord(body.notice)||typeof body.notice.opt_in!=='boolean')return {error:'invalid_notice'};
    const n=body.notice;
    if(typeof n.key!=='string'||!/^[a-f0-9]{32}$/.test(n.key)||n.key===body.response_key)return {error:'invalid_notice_key'};
    if(n.opt_in){
      if(n.consent!==true||typeof n.phone!=='string')return {error:'notice_consent_required'};
      const phone=n.phone.replace(/[^0-9]/g,'');
      if(!/^01[016789][0-9]{7,8}$/.test(phone))return {error:'invalid_notice_phone'};
      notice={key:n.key,optIn:true,phone};
    }else{
      if(n.consent===true||n.phone)return {error:'invalid_notice_opt_out'};
      notice={key:n.key,optIn:false};
    }
  }
  return {answers,feedback,responseKey:body.response_key,version:body.version,notice};
}
export const sameSiteOrigin=request=>{
  const origin=request.headers.get('origin');
  if(!origin)return false;
  let o;try{o=new URL(origin)}catch{return false}
  const self=new URL(request.url);
  return o.protocol==='https:'&&['ekodi.kr','cheonggye-market.pages.dev','cgma.or.kr'].includes(o.hostname)&&o.port===''&&
    // Host may be the Pages backing host after the canonical edge proxy.
    ['ekodi.kr','cheonggye-market.pages.dev','cgma.or.kr'].includes(self.hostname);
};
export async function readJson(request){
  const header=Number(request.headers.get('content-length')||0);
  if(header>12000)return {error:'payload_too_large',status:413};
  if(!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))return {error:'json_required',status:415};
  let text;try{text=await request.text()}catch{return {error:'invalid_body',status:400}}
  if(text.length>12000)return {error:'payload_too_large',status:413};
  try {return {value:JSON.parse(text)}}catch {return {error:'invalid_json',status:400}}
}
export async function saveSurvey(db,validated){
  const hash=await sha256(validated.responseKey);
  const result=await db.prepare(`INSERT INTO ${table}
    (id,response_key_hash,survey_version,answers_json,feedback)
    VALUES(?,?,?,?,?)
    ON CONFLICT(response_key_hash) DO UPDATE SET
      survey_version=excluded.survey_version,
      answers_json=excluded.answers_json,
      feedback=excluded.feedback,
      updated_at=CURRENT_TIMESTAMP`)
    .bind(crypto.randomUUID(),hash,validated.version,JSON.stringify(validated.answers),validated.feedback).run();
  return Boolean(result?.success!==false);
}
export async function saveNoticeContact(db,notice){
  if(!notice)return;
  const hash=await sha256(notice.key);
  if(!notice.optIn){
    await db.prepare(`DELETE FROM ${contactsTable} WHERE contact_key_hash=?`).bind(hash).run();
    return;
  }
  await db.prepare(`INSERT INTO ${contactsTable}(contact_key_hash,phone)
    VALUES(?,?)
    ON CONFLICT(contact_key_hash) DO UPDATE SET
      phone=excluded.phone,updated_at=CURRENT_TIMESTAMP,
      expires_at=datetime('now','+6 months')`).bind(hash,notice.phone).run();
}
export async function listNoticeContacts(db){
  const rows=await db.prepare(`SELECT phone,consent_at,updated_at,expires_at
    FROM ${contactsTable} WHERE expires_at>CURRENT_TIMESTAMP ORDER BY updated_at DESC LIMIT 300`).all();
  return (rows.results||[]).map(x=>({
    phone:String(x.phone||''),
    consent_at:String(x.consent_at||''),
    updated_at:String(x.updated_at||''),
    expires_at:String(x.expires_at||'')
  }));
}
export async function aggregateSurvey(db,{shared=false}={}){
  const totalRow=await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first();
  const total=Number(totalRow?.count||0);
  if(shared&&total<MIN_PUBLIC_RESPONSES){
    return {total,minimum_public_responses:MIN_PUBLIC_RESPONSES,suppressed:true,sections:[],daily:[]};
  }
  const sections=[];
  for(const question of SURVEY_QUESTIONS){
    const path='$.'+question.key;
    const sql=question.multiple
      ?`SELECT j.value AS answer,COUNT(*) AS count FROM ${table} r, json_each(r.answers_json,?) j GROUP BY j.value`
      :`SELECT json_extract(answers_json,?) AS answer,COUNT(*) AS count FROM ${table} GROUP BY answer`;
    const result=await db.prepare(sql).bind(path).all();
    const counts=new Map((result.results||[]).map(item=>[String(item.answer),Number(item.count||0)]));
    sections.push({
      key:question.key,title:question.title,multiple:Boolean(question.multiple),
      options:question.options.map(answer=>({answer,count:counts.get(answer)||0,percent:total?Math.round((counts.get(answer)||0)*1000/total)/10:0}))
    });
  }
  // Explicitly ranked choices: for historical v2 entries only the former
  // "priority" field is an actual rank. Prior unordered selections are not.
  const ranked_sections=[];
  for(let rank=0;rank<3;rank++){
    const expression=rank===0
      ?`CASE WHEN survey_version>=3 THEN json_extract(answers_json,'$.topics[0]') ELSE json_extract(answers_json,'$.priority') END`
      :`CASE WHEN survey_version>=3 THEN json_extract(answers_json,'$.topics[${rank}]') ELSE NULL END`;
    const rows=await db.prepare(`SELECT chosen AS answer, COUNT(*) AS count
      FROM (SELECT ${expression} AS chosen FROM ${table})
      WHERE chosen IS NOT NULL GROUP BY chosen`).all();
    const counts=new Map((rows.results||[]).map(item=>[String(item.answer),Number(item.count||0)]));
    const topicOptions=SURVEY_QUESTIONS.find(q=>q.key==='topics').options;
    ranked_sections.push({
      key:'topics_rank_'+(rank+1),title:'교육 희망 '+(rank+1)+'순위',multiple:false,
      options:topicOptions.map(answer=>({answer,count:counts.get(answer)||0,
        percent:total?Math.round((counts.get(answer)||0)*1000/total)/10:0}))
    });
  }
  const daily=await db.prepare(`SELECT substr(created_at,1,10) AS day,COUNT(*) AS count FROM ${table} WHERE created_at>=datetime('now','-30 days') GROUP BY day ORDER BY day DESC`).all();
  const stats={total,survey_version:SURVEY_VERSION,minimum_public_responses:MIN_PUBLIC_RESPONSES,
    suppressed:false,sections,ranked_sections,daily:(daily.results||[]).map(x=>({day:String(x.day),count:Number(x.count||0)})),
    calculated_at:new Date().toISOString()};
  if(!shared){
    const notes=await db.prepare(`SELECT feedback,created_at FROM ${table} WHERE feedback<>'' ORDER BY updated_at DESC LIMIT 30`).all();
    stats.notes=(notes.results||[]).map(x=>({text:String(x.feedback||'').slice(0,500),created_at:String(x.created_at||'')}));
  }
  return stats;
}
export async function newShare(db){
  const token=makeToken(),hash=await sha256(token),id=crypto.randomUUID();
  await db.prepare(`INSERT INTO ${shareTable}(id,token_hash,expires_at) VALUES(?,?,datetime('now','+7 days'))`)
    .bind(id,hash).run();
  return {id,token,url:'https://ekodi.kr/cgma/ai-education/report/?token='+token,expires_days:7};
}
export async function listShares(db){
  const r=await db.prepare(`SELECT id,created_at,expires_at,revoked_at FROM ${shareTable} ORDER BY created_at DESC LIMIT 40`).all();
  return (r.results||[]).map(x=>({id:String(x.id),created_at:String(x.created_at),expires_at:String(x.expires_at),revoked_at:x.revoked_at||null}));
}
export async function revokeShare(db,id){
  if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))return false;
  const r=await db.prepare(`UPDATE ${shareTable} SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND revoked_at IS NULL`).bind(id).run();
  return Number(r?.meta?.changes||0)>0;
}
export async function shareActive(db,token){
  if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return false;
  const hash=await sha256(token);
  const r=await db.prepare(`SELECT id FROM ${shareTable} WHERE token_hash=? AND revoked_at IS NULL AND expires_at>datetime('now') LIMIT 1`).bind(hash).first();
  return Boolean(r?.id);
}
