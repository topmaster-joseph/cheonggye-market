import { cgmaAdmin } from '../_shared/cgma-admin.js';

const defaults={
  normal:{title:'',message:''},
  maintenance:{title:'잠시 공사중입니다',message:'청계면상인회 홈페이지를 더 편리하게 준비하고 있습니다. 잠시 후 다시 찾아주세요.'},
  notice:{title:'청계면상인회 안내',message:'현재 꼭 필요한 안내사항을 먼저 전해드립니다.'}
};
const clean=(value,max)=>String(value??'').trim().slice(0,max);
const reply=(body,status=200,cache='no-store')=>Response.json(body,{status,headers:{'Cache-Control':cache}});

async function ensure(db){
  await db.prepare(`CREATE TABLE IF NOT EXISTS site_presentation_settings (
    site_key TEXT PRIMARY KEY,
    mode TEXT NOT NULL DEFAULT 'normal',
    title TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

async function readSetting(db){
  return await db.prepare('SELECT site_key,mode,title,message,updated_at FROM site_presentation_settings WHERE site_key=?').bind('cgma').first()
    || {site_key:'cgma',mode:'normal',...defaults.normal};
}
export async function onRequestGet({env}){
  const db=env.cheonggye_market_notices;
  if(!db)return reply({setting:{site_key:'cgma',mode:'normal',...defaults.normal},degraded:true});
  try{return reply({setting:await readSetting(db)},200,'public, max-age=15, s-maxage=30')}
  catch(error){console.warn('CGMA site mode fallback',error?.message||error);return reply({setting:{site_key:'cgma',mode:'normal',...defaults.normal},degraded:true})}
}

export async function onRequestPut({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return reply({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;if(!db)return reply({error:'site_mode_store_unavailable'},503);
  const body=await request.json();
  const mode=['normal','maintenance','notice'].includes(body?.mode)?body.mode:'normal',fallback=defaults[mode];
  const title=clean(body?.title,120)||fallback.title,message=clean(body?.message,600)||fallback.message;
  try{
    await ensure(db);
    await db.prepare(`INSERT INTO site_presentation_settings(site_key,mode,title,message,updated_by,updated_at)
      VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
      ON CONFLICT(site_key) DO UPDATE SET mode=excluded.mode,title=excluded.title,message=excluded.message,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`)
      .bind('cgma',mode,title,message,admin.user?.email||admin.user?.id||'admin').run();
    return reply({ok:true,setting:await readSetting(db)});
  }catch(error){console.error('CGMA site mode save',error);return reply({error:'site_mode_save_failed'},500)}
}
