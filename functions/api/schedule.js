import { cgmaAdmin } from '../_shared/cgma-admin.js';
import {
  SCHEDULE_TABLE,SCHEDULE_LIMITS,ensureScheduleSchema,parseScheduleInput,
  scheduleId,validMonth,monthRange,kstToday,publicEvent,adminEvent
} from '../_shared/cgma-schedule.js';

const reply=(body,status=200,cache='no-store')=>Response.json(body,{status,headers:{'Cache-Control':cache}});
const COLUMNS='id,title,category,place,description,link,start_date,end_date,start_time,end_time,status,updated_by,updated_at';
const ORDER='ORDER BY start_date ASC, CASE WHEN start_time=\'\' THEN 0 ELSE 1 END, start_time ASC, id ASC';

async function store(env){
  const db=env.cheonggye_market_notices;
  if(!db)return {db:null,failure:reply({error:'schedule_store_unavailable'},503)};
  try{await ensureScheduleSchema(db);return {db}}
  catch(error){console.warn('CGMA schedule schema failed',error?.message||error);return {db:null,failure:reply({error:'schedule_schema_failed'},503)}}
}

async function editor(request){
  const admin=await cgmaAdmin(request);
  return admin.allowed?{admin}:{failure:reply({error:admin.reason},admin.status)};
}

// GET /api/schedule?month=YYYY-MM[&upcoming=N][&id=N][&manage=1]
// Public: published rows only. manage=1 with a verified admin token also
// returns hidden rows so they can be edited in place.
export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const today=kstToday();
  const month=url.searchParams.get('month')||today.slice(0,7);
  if(!validMonth(month))return reply({error:'invalid_month'},400);
  const wantsManage=url.searchParams.get('manage')==='1';
  let manage=false;
  if(wantsManage){
    const check=await editor(request);
    if(check.failure)return check.failure;
    manage=true;
  }
  const {db,failure}=await store(env);
  if(failure)return failure;
  const visibility=manage?'1=1':"status='published'";
  const shape=manage?adminEvent:publicEvent;
  const {first,last}=monthRange(month);
  const upcomingLimit=Math.min(Math.max(Number(url.searchParams.get('upcoming')||5)||5,0),SCHEDULE_LIMITS.upcoming);
  const id=scheduleId(url.searchParams.get('id'));
  try{
    const rows=await db.prepare(`SELECT ${COLUMNS} FROM ${SCHEDULE_TABLE} WHERE ${visibility} AND start_date<=? AND end_date>=? ${ORDER} LIMIT ${SCHEDULE_LIMITS.monthRows}`).bind(last,first).all();
    const upcoming=upcomingLimit?await db.prepare(`SELECT ${COLUMNS} FROM ${SCHEDULE_TABLE} WHERE status='published' AND end_date>=? ${ORDER} LIMIT ${upcomingLimit}`).bind(today).all():{results:[]};
    const single=id?await db.prepare(`SELECT ${COLUMNS} FROM ${SCHEDULE_TABLE} WHERE ${visibility} AND id=?`).bind(id).first():null;
    return reply({
      month,today,manage,
      items:(rows.results||[]).map(shape),
      upcoming:(upcoming.results||[]).map(publicEvent),
      event:single?shape(single):null
    },200,manage?'no-store':'public, max-age=15, s-maxage=30');
  }catch(error){
    console.warn('CGMA schedule load failed',error?.message||error);
    return reply({items:[],upcoming:[],degraded:true,reason:'schedule_load_failed'},503);
  }
}

export async function onRequestPost({request,env}){
  const check=await editor(request);if(check.failure)return check.failure;
  const {db,failure}=await store(env);if(failure)return failure;
  const parsed=parseScheduleInput(await request.json().catch(()=>null));
  if(!parsed.ok)return reply({error:parsed.error,field:parsed.field},400);
  const v=parsed.value,by=check.admin.user?.email||'청계면상인회';
  const result=await db.prepare(`INSERT INTO ${SCHEDULE_TABLE}(title,category,place,description,link,start_date,end_date,start_time,end_time,status,created_by,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(v.title,v.category,v.place,v.description,v.link,v.startDate,v.endDate,v.startTime,v.endTime,v.status,by,by).run();
  return reply({ok:true,id:Number(result?.meta?.last_row_id)},201);
}

export async function onRequestPut({request,env}){
  const check=await editor(request);if(check.failure)return check.failure;
  const {db,failure}=await store(env);if(failure)return failure;
  const body=await request.json().catch(()=>null);
  const id=scheduleId(body?.id);if(!id)return reply({error:'id_required'},400);
  const parsed=parseScheduleInput(body);
  if(!parsed.ok)return reply({error:parsed.error,field:parsed.field},400);
  const v=parsed.value,by=check.admin.user?.email||'청계면상인회';
  const result=await db.prepare(`UPDATE ${SCHEDULE_TABLE} SET title=?,category=?,place=?,description=?,link=?,start_date=?,end_date=?,start_time=?,end_time=?,status=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(v.title,v.category,v.place,v.description,v.link,v.startDate,v.endDate,v.startTime,v.endTime,v.status,by,id).run();
  if(Number(result?.meta?.changes||0)<1)return reply({error:'not_found',id},404);
  return reply({ok:true,id});
}

export async function onRequestDelete({request,env}){
  const check=await editor(request);if(check.failure)return check.failure;
  const {db,failure}=await store(env);if(failure)return failure;
  const id=scheduleId(new URL(request.url).searchParams.get('id'));if(!id)return reply({error:'id_required'},400);
  const result=await db.prepare(`DELETE FROM ${SCHEDULE_TABLE} WHERE id=?`).bind(id).run();
  if(Number(result?.meta?.changes||0)<1)return reply({error:'not_found',id},404);
  return reply({ok:true,id});
}
