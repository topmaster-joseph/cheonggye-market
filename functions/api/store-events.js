const STORE_API='https://renzehysxirjilvdxacv.supabase.co/functions/v1/store-api';
const PUBLISHABLE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const EVENT_TYPES=new Set(['detail_open','directions_click','benefit_click','recommendation_click']);
const schema=`CREATE TABLE IF NOT EXISTS cgma_store_events(day TEXT NOT NULL,store_key TEXT NOT NULL,store_name TEXT NOT NULL,event_type TEXT NOT NULL,source TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(day,store_key,event_type,source))`;
const clean=(value,max)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max);
const storeKey=value=>clean(value,120).toLowerCase().replace(/전남목포대점|무안목포대점|무안캠퍼스시티점|목포대학점|목포대점|목대점|캠퍼스시티점/g,'').replace(/[^0-9a-z가-힣]/g,'');
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
function originAllowed(value){if(!value)return true;try{const url=new URL(value),host=url.hostname.toLowerCase();if(url.protocol==='https:'&&['cgma.or.kr','www.cgma.or.kr','ekodi.kr','www.ekodi.kr'].includes(host))return true;return url.protocol==='http:'&&['127.0.0.1','localhost'].includes(host);}catch{return false;}}
function koreaDay(offset=0){const d=new Date(Date.now()-offset*86400000),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d),o=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${o.year}-${o.month}-${o.day}`;}
async function ensure(db){await db.prepare(schema).run();await db.prepare('CREATE INDEX IF NOT EXISTS idx_cgma_store_events_store_day ON cgma_store_events(store_key,day)').run();}
async function authorizedStore(request,storeId){const auth=request.headers.get('authorization')||'';if(!/^Bearer\s+\S+/i.test(auth)||!storeId)return null;const r=await fetch(`${STORE_API}/stores`,{headers:{apikey:PUBLISHABLE_KEY,Authorization:auth}});if(!r.ok)return null;const data=await r.json().catch(()=>({}));return (data.stores||[]).find(store=>String(store.id)===String(storeId))||null;}
export async function onRequestPost({request,env}){
 const db=env.cheonggye_market_notices;if(!db)return reply({error:'analytics_store_unavailable'},503);await ensure(db);
 const origin=request.headers.get('origin')||'';if(!originAllowed(origin))return reply({error:'origin_not_allowed'},403);
 let body;try{body=await request.json()}catch{return reply({error:'invalid_json'},400)}
 if(clean(body.website,120))return reply({ok:true},202);
 const storeName=clean(body.store_name,120),key=storeKey(storeName),eventType=clean(body.event_type,40),source=clean(body.source,50).toLowerCase().replace(/[^a-z0-9_-]/g,'');
 if(!key||!EVENT_TYPES.has(eventType)||!source)return reply({error:'invalid_event'},400);
 await db.prepare(`INSERT INTO cgma_store_events(day,store_key,store_name,event_type,source,count) VALUES(?,?,?,?,?,1) ON CONFLICT(day,store_key,event_type,source) DO UPDATE SET count=count+1,store_name=excluded.store_name,updated_at=CURRENT_TIMESTAMP`).bind(koreaDay(),key,storeName,eventType,source).run();
 return reply({ok:true},202);
}
export async function onRequestGet({request,env}){
 const db=env.cheonggye_market_notices;if(!db)return reply({error:'analytics_store_unavailable'},503);await ensure(db);
 const url=new URL(request.url),storeId=clean(url.searchParams.get('store_id'),80),days=Math.min(30,Math.max(1,Number(url.searchParams.get('days'))||7)),store=await authorizedStore(request,storeId);
 if(!store)return reply({error:'store_access_required'},403);const key=storeKey(store.name),from=koreaDay(days-1);
 const result=await db.prepare('SELECT day,event_type,source,SUM(count) AS count FROM cgma_store_events WHERE store_key=? AND day>=? GROUP BY day,event_type,source ORDER BY day DESC').bind(key,from).all();
 const totals={detail_open:0,directions_click:0,benefit_click:0,recommendation_click:0},daily={};for(const row of result.results||[]){const n=Number(row.count||0);if(row.event_type in totals)totals[row.event_type]+=n;(daily[row.day]??={detail_open:0,directions_click:0,benefit_click:0,recommendation_click:0})[row.event_type]=(daily[row.day]?.[row.event_type]||0)+n;}
 return reply({store:{id:store.id,name:store.name},days,from,to:koreaDay(),totals,daily:Object.entries(daily).map(([day,counts])=>({day,...counts}))});
}
