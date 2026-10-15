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
  const row=await db.prepare('SELECT intake_open FROM cgma_festival2026_settings WHERE event_id=?').bind(EVENT_ID).first();
  if(!row)throw Error('festival_schema_missing');
  return Number(row.intake_open)===1;
}
export function normalizePhone(value){
  const phone=clean(value,30).replace(/[\s()-]/g,'');
  return /^0\d{8,10}$/.test(phone)?phone:null;
}
