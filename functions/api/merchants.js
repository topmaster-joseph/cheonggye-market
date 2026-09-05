import { cgmaAdmin } from '../_shared/cgma-admin.js';
import { merchantDefaults } from '../_shared/cgma-merchant-defaults.js';

const clean=(value,max)=>String(value??'').trim().slice(0,max);
const reply=(body,status=200,cache='no-store')=>Response.json(body,{status,headers:{'Cache-Control':cache}});
const membershipValues=new Set(['regular','associate']);
const categoryValues=new Set(['food','cafe','life','culture']);
const publicRow=row=>({
  id:row.id,name:row.name,category:row.category,industry:row.industry,address:row.address,
  phone:row.phone||'',membership:row.membership,sort_order:Number(row.sort_order||0)
});

async function ensure(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS cgma_merchants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'life',
    industry TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    membership TEXT NOT NULL DEFAULT 'associate',
    visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 100,
    source TEXT NOT NULL DEFAULT 'admin',
    updated_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}
async function seed(db){
  const count=await db.prepare("SELECT COUNT(*) AS count FROM cgma_merchants WHERE source='legacy-map'").first();
  if(Number(count?.count||0)>=merchantDefaults.length)return;
  for(const row of merchantDefaults){
    await db.prepare('INSERT OR IGNORE INTO cgma_merchants(id,name,category,industry,address,phone,membership,visible,sort_order,source) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .bind(row.id,row.name,row.category,row.industry,row.address,row.phone||'',row.membership,Number(row.visible)!==0?1:0,row.sort_order,'legacy-map').run();
  }
}
function input(body){
  const membership=membershipValues.has(body?.membership)?body.membership:'associate';
  const category=categoryValues.has(body?.category)?body.category:'life';
  return {
    name:clean(body?.name,160),category,industry:clean(body?.industry,100),address:clean(body?.address,240),
    phone:clean(body?.phone,40),membership,visible:body?.visible===false?0:1,
    sort_order:Math.max(0,Math.min(99999,Number(body?.sort_order)||100))
  };
}
function fallback(includeHidden=false){
  return merchantDefaults.filter(row=>includeHidden||Number(row.visible)!==0).map(row=>includeHidden?row:publicRow(row));
}

export async function onRequestGet({request,env}){
  const includeHidden=new URL(request.url).searchParams.get('include_hidden')==='1';
  if(includeHidden){const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status)}
  const db=env.cheonggye_market_notices;
  if(!db)return reply({items:fallback(includeHidden),degraded:true,reason:'merchant_store_unavailable'});
  try{
    if(includeHidden){await ensure(db);await seed(db)}
    const query=includeHidden?'SELECT * FROM cgma_merchants ORDER BY sort_order,name':'SELECT * FROM cgma_merchants WHERE visible=1 ORDER BY sort_order,name';
    const result=await db.prepare(query).all();
    const items=includeHidden?(result.results||[]):((result.results||[]).map(publicRow));
    return reply({items},200,includeHidden?'no-store':'public, max-age=30, s-maxage=60');
  }catch(error){console.warn('CGMA merchants fallback active',error?.message||error);return reply({items:fallback(includeHidden),degraded:true,reason:'merchant_load_failed'})}
}
export async function onRequestPost({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;if(!db)return reply({error:'merchant_store_unavailable'},503);
  const value=input(await request.json());if(!value.name)return reply({error:'name_required'},400);
  await ensure(db);await seed(db);
  const id=crypto.randomUUID();
  await db.prepare('INSERT INTO cgma_merchants(id,name,category,industry,address,phone,membership,visible,sort_order,source,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id,value.name,value.category,value.industry,value.address,value.phone,value.membership,value.visible,value.sort_order,'admin',admin.user?.email||admin.user?.id||'admin').run();
  const row=await db.prepare('SELECT * FROM cgma_merchants WHERE id=?').bind(id).first();
  return reply({ok:true,item:row},201);
}

export async function onRequestPut({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;if(!db)return reply({error:'merchant_store_unavailable'},503);
  const body=await request.json(),id=clean(body?.id,80),value=input(body);if(!id||!value.name)return reply({error:'id_name_required'},400);
  await ensure(db);await seed(db);
  await db.prepare('UPDATE cgma_merchants SET name=?,category=?,industry=?,address=?,phone=?,membership=?,visible=?,sort_order=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .bind(value.name,value.category,value.industry,value.address,value.phone,value.membership,value.visible,value.sort_order,admin.user?.email||admin.user?.id||'admin',id).run();
  const row=await db.prepare('SELECT * FROM cgma_merchants WHERE id=?').bind(id).first();if(!row)return reply({error:'merchant_not_found'},404);
  return reply({ok:true,item:row});
}

export async function onRequestDelete({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;if(!db)return reply({error:'merchant_store_unavailable'},503);
  const id=clean(new URL(request.url).searchParams.get('id'),80);if(!id)return reply({error:'id_required'},400);
  await ensure(db);const row=await db.prepare('SELECT source FROM cgma_merchants WHERE id=?').bind(id).first();if(!row)return reply({error:'merchant_not_found'},404);
  if(row.source==='legacy-map')await db.prepare('UPDATE cgma_merchants SET visible=0,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(admin.user?.email||admin.user?.id||'admin',id).run();
  else await db.prepare('DELETE FROM cgma_merchants WHERE id=?').bind(id).run();
  return reply({ok:true,id,hidden:row.source==='legacy-map'});
}
