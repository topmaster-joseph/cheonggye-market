import { cgmaAdmin } from '../_shared/cgma-admin.js';

const clean=(value,max)=>String(value??'').trim().slice(0,max);
const reply=(body,status=200,cache='no-store')=>Response.json(body,{status,headers:{'Cache-Control':cache}});
const input=body=>({
  title:clean(body?.title,120),
  content:clean(body?.content,4000),
  category:clean(body?.category,20)||'공지',
  pinned:body?.pinned?1:0
});

export async function onRequestGet({env}){
  const db=env.cheonggye_market_notices;
  if(!db)return reply({items:[],degraded:true,reason:'notice_store_unavailable'});
  try{
    const result=await db.prepare('SELECT id,title,content,category,author,pinned,created_at,updated_at FROM notices ORDER BY pinned DESC, created_at DESC LIMIT 80').all();
    return reply({items:result.results||[]},200,'public, max-age=15, s-maxage=30');
  }catch(error){console.warn('CGMA notices fallback active',error?.message||error);return reply({items:[],degraded:true,reason:'notice_load_failed'})}
}

export async function onRequestPost({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;if(!db)return reply({error:'notice_store_unavailable'},503);
  const value=input(await request.json());if(!value.title||!value.content)return reply({error:'required'},400);
  const result=await db.prepare('INSERT INTO notices(title,content,category,author,pinned) VALUES(?,?,?,?,?)')
    .bind(value.title,value.content,value.category,admin.user?.email||'청계면상인회',value.pinned).run();
  return reply({ok:true,id:result.meta.last_row_id},201);
}
export async function onRequestPut({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;if(!db)return reply({error:'notice_store_unavailable'},503);
  const body=await request.json(),id=Number(body?.id),value=input(body);
  if(!id||!value.title||!value.content)return reply({error:'required'},400);
  await db.prepare('UPDATE notices SET title=?,content=?,category=?,pinned=?,author=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .bind(value.title,value.content,value.category,value.pinned,admin.user?.email||'청계면상인회',id).run();
  return reply({ok:true,id});
}

export async function onRequestDelete({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;if(!db)return reply({error:'notice_store_unavailable'},503);
  const id=Number(new URL(request.url).searchParams.get('id'));if(!id)return reply({error:'id'},400);
  await db.prepare('DELETE FROM notices WHERE id=?').bind(id).run();
  return reply({ok:true,id});
}
