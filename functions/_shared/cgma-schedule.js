// 청계면상인회 일정표 — shared validation and storage helpers.
// Public visitors read published rows only; every write is authorized by the
// server-side cgmaAdmin() check in functions/api/schedule.js.

export const SCHEDULE_TABLE='cgma_schedule_events';
export const SCHEDULE_CATEGORIES=Object.freeze(['행사','회의','교육','축제','모집','기타']);
export const SCHEDULE_LIMITS=Object.freeze({title:120,place:120,description:2000,link:500,spanDays:366,monthRows:300,upcoming:10});

export const SCHEDULE_SCHEMA=[
  `CREATE TABLE IF NOT EXISTS ${SCHEDULE_TABLE}(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '행사',
    place TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    start_time TEXT NOT NULL DEFAULT '',
    end_time TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','hidden')),
    created_by TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cgma_schedule_public ON ${SCHEDULE_TABLE}(status,start_date,end_date)`
];

const schemaReady=new WeakMap();
export function ensureScheduleSchema(db){
  let pending=schemaReady.get(db);
  if(!pending){
    pending=(async()=>{for(const sql of SCHEDULE_SCHEMA)await db.prepare(sql).run()})();
    schemaReady.set(db,pending);
    // A failed attempt must not poison later requests in the same isolate.
    pending.catch(()=>schemaReady.delete(db));
  }
  return pending;
}

const clean=(value,max)=>String(value??'').replace(/\r\n?/g,'\n').trim().slice(0,max);
const oneLine=(value,max)=>clean(value,max).replace(/[\n\t\u2028\u2029]+/g,' ').replace(/\s{2,}/g,' ');

export function validDate(value){
  const text=String(value??'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return false;
  const parsed=new Date(text+'T00:00:00Z');
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===text;
}
export const validTime=value=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(value??''));
export const validMonth=value=>/^\d{4}-(?:0[1-9]|1[0-2])$/.test(String(value??''));

export function kstToday(now=new Date()){
  return new Date(now.getTime()+9*3600*1000).toISOString().slice(0,10);
}

export function monthRange(month){
  if(!validMonth(month))return null;
  const [year,mon]=month.split('-').map(Number);
  const last=new Date(Date.UTC(year,mon,0)).getUTCDate();
  return {first:`${month}-01`,last:`${month}-${String(last).padStart(2,'0')}`};
}

const dayDiff=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);

function safeLink(value){
  const text=clean(value,SCHEDULE_LIMITS.link);
  if(!text)return {ok:true,value:''};
  try{
    const url=new URL(text);
    if(url.protocol!=='https:'&&url.protocol!=='http:')return {ok:false};
    if(url.username||url.password)return {ok:false};
    return {ok:true,value:url.href};
  }catch{return {ok:false}}
}

// Returns {ok:true,value} or {ok:false,error,field} with Korean-safe error codes.
export function parseScheduleInput(body){
  const title=oneLine(body?.title,SCHEDULE_LIMITS.title);
  if(!title)return {ok:false,error:'title_required',field:'title'};
  const startDate=String(body?.startDate??'').trim();
  if(!validDate(startDate))return {ok:false,error:'start_date_invalid',field:'startDate'};
  const endDate=String(body?.endDate??'').trim()||startDate;
  if(!validDate(endDate))return {ok:false,error:'end_date_invalid',field:'endDate'};
  if(endDate<startDate)return {ok:false,error:'end_before_start',field:'endDate'};
  if(dayDiff(startDate,endDate)>SCHEDULE_LIMITS.spanDays)return {ok:false,error:'span_too_long',field:'endDate'};
  const startTime=String(body?.startTime??'').trim();
  const endTime=String(body?.endTime??'').trim();
  if(startTime&&!validTime(startTime))return {ok:false,error:'start_time_invalid',field:'startTime'};
  if(endTime&&!validTime(endTime))return {ok:false,error:'end_time_invalid',field:'endTime'};
  if(endTime&&!startTime)return {ok:false,error:'start_time_required',field:'startTime'};
  if(startTime&&endTime&&startDate===endDate&&endTime<startTime)return {ok:false,error:'end_before_start',field:'endTime'};
  const link=safeLink(body?.link);
  if(!link.ok)return {ok:false,error:'link_invalid',field:'link'};
  const category=SCHEDULE_CATEGORIES.includes(String(body?.category??''))?String(body.category):'행사';
  const status=body?.status==='hidden'?'hidden':'published';
  return {ok:true,value:{
    title,category,status,startDate,endDate,startTime,endTime,
    place:oneLine(body?.place,SCHEDULE_LIMITS.place),
    description:clean(body?.description,SCHEDULE_LIMITS.description),
    link:link.value
  }};
}

export function scheduleId(value){
  const text=String(value??'');
  return /^[1-9]\d{0,12}$/.test(text)?Number(text):0;
}

// Public shape: no editor identities or internal timestamps leave the server.
export function publicEvent(row){
  return {
    id:Number(row.id),title:row.title,category:row.category,place:row.place||'',
    description:row.description||'',link:row.link||'',
    startDate:row.start_date,endDate:row.end_date,startTime:row.start_time||'',endTime:row.end_time||''
  };
}
export function adminEvent(row){
  return {...publicEvent(row),status:row.status,updatedBy:row.updated_by||'',updatedAt:row.updated_at||''};
}
