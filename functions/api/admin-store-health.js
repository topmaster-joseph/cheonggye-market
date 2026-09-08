import {cgmaAdmin} from '../_shared/cgma-admin.js';
import {summarizeMarketHealth} from '../_shared/cgma-market-health.js';
import {ensureStoreEvents,ensureStoreGraph,buildAliasIndex,resolveIdentity} from '../_shared/cgma-store-identity.js';
import {playbookForSignals} from '../_shared/cgma-intervention-playbook.js';
const experimentSchema=`CREATE TABLE IF NOT EXISTS cgma_store_experiments(id TEXT PRIMARY KEY,store_id TEXT NOT NULL,store_key TEXT NOT NULL,store_name TEXT NOT NULL,action_key TEXT NOT NULL,metric TEXT NOT NULL,title TEXT NOT NULL,hypothesis TEXT,start_day TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,completed_at TEXT,end_day TEXT)`;
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function koreaDay(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),o=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${o.year}-${o.month}-${o.day}`;}
function shiftDay(day,offset){const [y,m,d]=String(day).split('-').map(Number),date=new Date(Date.UTC(y,m-1,d+offset));return date.toISOString().slice(0,10)}
export async function onRequestGet({request,env}){
 const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason||'tenant_admin_required'},admin.status||403);const db=env.cheonggye_market_notices;if(!db)return reply({error:'analytics_store_unavailable'},503);
 await ensureStoreEvents(db);await ensureStoreGraph(db);await db.prepare(experimentSchema).run();const to=koreaDay(),from=shiftDay(to,-13);
 const [eventRows,experimentRows,aliasRows]=await Promise.all([db.prepare(`SELECT store_id,store_key,MAX(store_name) AS store_name,day,event_type,SUM(count) AS count FROM cgma_store_events WHERE day>=? GROUP BY store_id,store_key,day,event_type ORDER BY day DESC`).bind(from).all(),db.prepare(`SELECT store_id,store_key,status FROM cgma_store_experiments WHERE status='active'`).all(),db.prepare('SELECT store_id,alias_key,store_name FROM cgma_store_aliases').all()]);
 const aliases=aliasRows.results||[],aliasIndex=buildAliasIndex(aliases),events=(eventRows.results||[]).map(row=>({...row,identity_key:resolveIdentity(row,aliasIndex)})),experiments=(experimentRows.results||[]).map(row=>({...row,identity_key:resolveIdentity(row,aliasIndex)})),health=summarizeMarketHealth(events,experiments,to);
 const canonicalStores=new Set(aliases.map(row=>row.store_id).filter(Boolean)).size,intervention=health.intervention.map(item=>({...item,playbook:playbookForSignals(item.signals)}));return reply({...health,intervention,identity:{mode:'store_id',canonicalStores,aliases:aliases.length},privacy:{visitor_identifiers:false,aggregation:'canonical_store_day_event'},scope:'tenant:cheonggye'});
}
