const D1_SCHEMA=`
CREATE TABLE IF NOT EXISTS cgma_festival2026_settings(event_id TEXT PRIMARY KEY,intake_open INTEGER NOT NULL DEFAULT 1 CHECK(intake_open IN (0,1)),updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
INSERT OR IGNORE INTO cgma_festival2026_settings(event_id,intake_open) VALUES ('cgma-du-dream-2026',1);
CREATE TABLE IF NOT EXISTS cgma_festival2026_applications(
 id INTEGER PRIMARY KEY AUTOINCREMENT,receipt TEXT NOT NULL UNIQUE,
 event_id TEXT NOT NULL CHECK(event_id='cgma-du-dream-2026'),
 shop_name TEXT NOT NULL,phone TEXT NOT NULL,item_description TEXT NOT NULL,
 membership_choice TEXT NOT NULL CHECK(membership_choice IN ('regular','joining')),
 membership_verified INTEGER NOT NULL DEFAULT 0 CHECK(membership_verified IN(0,1)),
 other_support_selected INTEGER NOT NULL DEFAULT 0 CHECK(other_support_selected IN(0,1)),
 selection_state TEXT NOT NULL DEFAULT 'pending' CHECK(selection_state IN('pending','selected','waitlist','rejected')),
 privacy_consented_at TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(event_id,shop_name,phone)
);
CREATE INDEX IF NOT EXISTS idx_cgma_festival2026_review ON cgma_festival2026_applications(event_id,selection_state,created_at);
`;
const schemaCache=new WeakMap();
export async function ensureFestivalSchema(db){
 if(!db||typeof db.exec!=='function')throw Error('festival_db_binding_missing');
 let promise=schemaCache.get(db);
 if(!promise){
   promise=db.exec(D1_SCHEMA);
   schemaCache.set(db,promise);
   promise.catch(()=>{if(schemaCache.get(db)===promise)schemaCache.delete(db)});
 }
 await promise;
}
export const EVENT_ID='cgma-du-dream-2026';
export const DB_BINDING='cheonggye_market_notices';
export const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store, max-age=0','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
export const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max+1):'';
export const database=env=>env?.[DB_BINDING]||null;
export function sameOrigin(request){
  const origin=request.headers.get('origin');
  const url=new URL(request.url);
  if(origin===url.origin)return true;
  // The canonical /cgma gateway forwards to the owned Pages upstream.
  return url.hostname==='cheonggye-market.pages.dev' && (origin==='https://ekodi.kr'||origin==='https://cgma.or.kr');
}
export async function parseJson(request){
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')||''))return null;
  const size=Number(request.headers.get('content-length')||0);
  if(size>8192)return null;
  const raw=await request.text();
  if(raw.length>8192)return null;
  try {const obj=JSON.parse(raw);return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:null;}catch{return null;}
}
export async function intakeStatus(db){
  await ensureFestivalSchema(db);
  const row=await db.prepare('SELECT intake_open FROM cgma_festival2026_settings WHERE event_id=?').bind(EVENT_ID).first();
  if(!row)throw Error('festival_schema_missing');
  return Number(row.intake_open)===1;
}
export function normalizePhone(value){
  const phone=clean(value,30).replace(/[\s()-]/g,'');
  return /^0\d{8,10}$/.test(phone)?phone:null;
}
