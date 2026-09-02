import { cgmaAdmin } from '../_shared/cgma-admin.js';

const schema=`CREATE TABLE IF NOT EXISTS cgma_parking_petition(
  id TEXT PRIMARY KEY,
  signer_name TEXT NOT NULL,
  signer_division TEXT NOT NULL,
  residential_area TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

const clean=(value,max)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max);
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});

async function ensure(db){await db.prepare(schema).run()}
async function count(db){const row=await db.prepare('SELECT COUNT(*) AS count FROM cgma_parking_petition').first();return Number(row?.count||0)}

export async function onRequestGet({request,env}){
  const db=env.cheonggye_market_notices;await ensure(db);
  const url=new URL(request.url),includeEntries=url.searchParams.get('include_entries')==='1';
  if(!includeEntries)return reply({count:await count(db)});
  const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status);
  const result=await db.prepare('SELECT id,signer_name,signer_division,residential_area,created_at FROM cgma_parking_petition ORDER BY created_at DESC LIMIT 500').all();
  return reply({count:await count(db),items:result.results||[]});
}

export async function onRequestPost({request,env}){
  const db=env.cheonggye_market_notices;await ensure(db);
  let body;try{body=await request.json()}catch{return reply({error:'invalid_json'},400)}
  if(clean(body.website,120))return reply({ok:true,count:await count(db)},201);
  const signerName=clean(body.signer_name,40);
  const signerDivision=clean(body.signer_division,60);
  const residentialArea=clean(body.residential_area,80);
  const consent=body.consent===true;
  if(signerName.length<2||!signerDivision||!residentialArea||!consent){
    return reply({error:'required_fields'},400);
  }
  await db.prepare('INSERT INTO cgma_parking_petition(id,signer_name,signer_division,residential_area) VALUES(?,?,?,?)')
    .bind(crypto.randomUUID(),signerName,signerDivision,residentialArea).run();
  return reply({ok:true,count:await count(db)},201);
}
