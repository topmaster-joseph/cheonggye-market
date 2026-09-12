import { cgmaAdmin } from '../_shared/cgma-admin.js';
import { merchantDefaults } from '../_shared/cgma-merchant-defaults.js';

const clean=(value,max)=>String(value??'').trim().slice(0,max);
const reply=(body,status=200,cache='no-store')=>Response.json(body,{status,headers:{'Cache-Control':cache}});
const membershipValues=new Set(['regular','associate']);
const categoryValues=new Set(['food','cafe','life','culture']);
const MEMBERSHIP_RECONCILIATION='20260912-regular-54-v1';
const BHC_DEFAULT={id:'cgma-085',name:'BHC치킨',category:'food',industry:'치킨',address:'청계면 상권',phone:'',membership:'regular',visible:1,sort_order:505,source:'legacy-map'};
const publicRow=row=>({
  id:row.id,name:row.name,category:row.category,industry:row.industry,address:row.address,
  phone:row.phone||'',membership:row.membership,sort_order:Number(row.sort_order||0)
});
const adminRow=row=>({
  ...publicRow(row),visible:Number(row.visible)!==0?1:0,source:row.source||'',
  updated_by:row.updated_by||'',created_at:row.created_at||'',updated_at:row.updated_at||''
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
    member_origin TEXT NOT NULL DEFAULT 'unknown',
    visible INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 100,
    source TEXT NOT NULL DEFAULT 'admin',
    updated_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  const columns=await db.prepare('PRAGMA table_info(cgma_merchants)').all();
  if(!(columns.results||[]).some(column=>column.name==='member_origin')){
    await db.prepare("ALTER TABLE cgma_merchants ADD COLUMN member_origin TEXT NOT NULL DEFAULT 'unknown'").run();
  }
  await db.prepare(`CREATE TABLE IF NOT EXISTS cgma_data_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
async function reconcileOfficialMembership(db){
  const applied=await db.prepare('SELECT id FROM cgma_data_migrations WHERE id=?').bind(MEMBERSHIP_RECONCILIATION).first();
  if(applied)return;
  await db.prepare("UPDATE cgma_merchants SET membership='regular',updated_at=CURRENT_TIMESTAMP WHERE name IN ('목대부리또','맘스터치 목포대점') AND membership<>'regular'").run();
  await db.prepare('INSERT OR IGNORE INTO cgma_merchants(id,name,category,industry,address,phone,membership,visible,sort_order,source) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .bind(BHC_DEFAULT.id,BHC_DEFAULT.name,BHC_DEFAULT.category,BHC_DEFAULT.industry,BHC_DEFAULT.address,BHC_DEFAULT.phone,BHC_DEFAULT.membership,BHC_DEFAULT.visible,BHC_DEFAULT.sort_order,BHC_DEFAULT.source).run();
  await db.prepare('INSERT OR IGNORE INTO cgma_data_migrations(id) VALUES(?)').bind(MEMBERSHIP_RECONCILIATION).run();
}
async function ready(db){await ensure(db);await seed(db);await reconcileOfficialMembership(db)}
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
  const rows=merchantDefaults.map(row=>['목대부리또','맘스터치 목포대점'].includes(row.name)?{...row,membership:'regular'}:row);
  if(!rows.some(row=>row.name===BHC_DEFAULT.name))rows.push(BHC_DEFAULT);
  return rows.filter(row=>includeHidden||Number(row.visible)!==0).map(row=>includeHidden?adminRow(row):publicRow(row));
}

export async function onRequestGet({request,env}){
  const includeHidden=new URL(request.url).searchParams.get('include_hidden')==='1';
  if(includeHidden){const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status)}
  const db=env.cheonggye_market_notices;
  if(!db)return reply({items:fallback(includeHidden),degraded:true,reason:'merchant_store_unavailable'});
  try{
    await ready(db);
    const query=includeHidden?'SELECT * FROM cgma_merchants ORDER BY sort_order,name':'SELECT * FROM cgma_merchants WHERE visible=1 ORDER BY sort_order,name';
    const result=await db.prepare(query).all();
    const items=(result.results||[]).map(includeHidden?adminRow:publicRow);
    return reply({items},200,includeHidden?'no-store':'public, max-age=30, s-maxage=60');
  }catch(error){console.warn('CGMA merchants fallback active',error?.message||error);return reply({items:fallback(includeHidden),degraded:true,reason:'merchant_load_failed'})}
}
export async function onRequestPost({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;if(!db)return reply({error:'merchant_store_unavailable'},503);
  const value=input(await request.json());if(!value.name)return reply({error:'name_required'},400);
  await ready(db);
  const id=crypto.randomUUID();
  await db.prepare('INSERT INTO cgma_merchants(id,name,category,industry,address,phone,membership,visible,sort_order,source,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id,value.name,value.category,value.industry,value.address,value.phone,value.membership,value.visible,value.sort_order,'admin',admin.user?.email||admin.user?.id||'admin').run();
  const row=await db.prepare('SELECT * FROM cgma_merchants WHERE id=?').bind(id).first();
  return reply({ok:true,item:adminRow(row)},201);
}

export async function onRequestPut({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;if(!db)return reply({error:'merchant_store_unavailable'},503);
  const body=await request.json(),id=clean(body?.id,80),value=input(body);if(!id||!value.name)return reply({error:'id_name_required'},400);
  await ready(db);
  await db.prepare('UPDATE cgma_merchants SET name=?,category=?,industry=?,address=?,phone=?,membership=?,visible=?,sort_order=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .bind(value.name,value.category,value.industry,value.address,value.phone,value.membership,value.visible,value.sort_order,admin.user?.email||admin.user?.id||'admin',id).run();
  const row=await db.prepare('SELECT * FROM cgma_merchants WHERE id=?').bind(id).first();if(!row)return reply({error:'merchant_not_found'},404);
  return reply({ok:true,item:adminRow(row)});
}

export async function onRequestDelete({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;if(!db)return reply({error:'merchant_store_unavailable'},503);
  const id=clean(new URL(request.url).searchParams.get('id'),80);if(!id)return reply({error:'id_required'},400);
  await ready(db);const row=await db.prepare('SELECT source FROM cgma_merchants WHERE id=?').bind(id).first();if(!row)return reply({error:'merchant_not_found'},404);
  if(row.source==='legacy-map')await db.prepare('UPDATE cgma_merchants SET visible=0,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(admin.user?.email||admin.user?.id||'admin',id).run();
  else await db.prepare('DELETE FROM cgma_merchants WHERE id=?').bind(id).run();
  return reply({ok:true,id,hidden:row.source==='legacy-map'});
}
