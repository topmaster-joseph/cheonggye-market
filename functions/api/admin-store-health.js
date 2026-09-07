import {cgmaAdmin} from '../_shared/cgma-admin.js';
import {summarizeMarketHealth} from '../_shared/cgma-market-health.js';
const eventSchema=`CREATE TABLE IF NOT EXISTS cgma_store_events(day TEXT NOT NULL,store_key TEXT NOT NULL,store_name TEXT NOT NULL,event_type TEXT NOT NULL,source TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(day,store_key,event_type,source))`;
const experimentSchema=`CREATE TABLE IF NOT EXISTS cgma_store_experiments(id TEXT PRIMARY KEY,store_id TEXT NOT NULL,store_key TEXT NOT NULL,store_name TEXT NOT NULL,action_key TEXT NOT NULL,metric TEXT NOT NULL,title TEXT NOT NULL,hypothesis TEXT,start_day TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,completed_at TEXT,end_day TEXT)`;
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function koreaDay(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),o=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${o.year}-${o.month}-${o.day}`;}
function shiftDay(day,offset){const [y,m,d]=String(day).split('-').map(Number),date=new Date(Date.UTC(y,m-1,d+offset));return date.toISOString().slice(0,10)}
export async function onRequestGet({request,env}){
 const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason||'tenant_admin_required'},admin.status||403);
 const db=env.cheonggye_market_notices;if(!db)return reply({error:'analytics_store_unavailable'},503);await db.prepare(eventSchema).run();await db.prepare(experimentSchema).run();
 const to=koreaDay(),from=shiftDay(to,-13),events=await db.prepare(`SELECT store_key,MAX(store_name) AS store_name,day,event_type,SUM(count) AS count FROM cgma_store_events WHERE day>=? GROUP BY store_key,day,event_type ORDER BY day DESC`).bind(from).all();
 const experiments=await db.prepare(`SELECT store_key,status FROM cgma_store_experiments WHERE status='active'`).all(),health=summarizeMarketHealth(events.results||[],experiments.results||[],to);
 return reply({...health,privacy:{visitor_identifiers:false,aggregation:'store_day_event'},scope:'tenant:cheonggye'});
}
