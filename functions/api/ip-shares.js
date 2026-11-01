import {cgmaAdmin} from '../_shared/cgma-admin.js';
import {validateShareRequest,newShareToken,sha256,expiresSql,sanitizeShareRow,MAX_ACTIVE_SHARES_PER_DAY} from '../_shared/cgma-ip-share.js';

const schema=`CREATE TABLE IF NOT EXISTS cgma_ip_external_shares(
 id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE,
 recipient_email TEXT NOT NULL, document_ids TEXT NOT NULL,
 purpose TEXT NOT NULL, created_by TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at TEXT NOT NULL, revoked_at TEXT
)`;
const json=(body,status=200)=>Response.json(body,{status,headers:{
  'Cache-Control':'private, no-store','Pragma':'no-cache',
  'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
  'X-Robots-Tag':'noindex, nofollow, noarchive'
}});
async function guard(request,env){
  const admin=await cgmaAdmin(request);
  if(!admin.allowed)return {response:json({error:admin.reason},admin.status)};
  if(!env.cheonggye_market_notices)return {response:json({error:'archive_database_unavailable'},503)};
  return {admin,db:env.cheonggye_market_notices};
}
async function ensure(db){await db.prepare(schema).run()}

export async function onRequestGet({request,env}){
  const g=await guard(request,env);if(g.response)return g.response;
  try{
    await ensure(g.db);
    const rows=await g.db.prepare('SELECT * FROM cgma_ip_external_shares ORDER BY created_at DESC LIMIT 100').all();
    return json({ok:true,items:(rows.results||[]).map(sanitizeShareRow)});
  }catch(error){console.warn('CGMA IP shares list failed',error?.message||error);return json({error:'archive_storage_unavailable'},503)}
}

export async function onRequestPost({request,env}){
  const g=await guard(request,env);if(g.response)return g.response;
  let body;try{body=await request.json()}catch{return json({error:'json_required'},400)}
  const validated=validateShareRequest(body);
  if(!validated.ok)return json({error:validated.error},400);
  try{
    await ensure(g.db);
    const userEmail=String(g.admin.user?.email||g.admin.user?.id||'').slice(0,254);
    const count=await g.db.prepare("SELECT COUNT(*) AS total FROM cgma_ip_external_shares WHERE created_by=? AND created_at>=datetime('now','-1 day')").bind(userEmail).first();
    if(Number(count?.total||0)>=MAX_ACTIVE_SHARES_PER_DAY)return json({error:'daily_share_limit'},429);
    const token=newShareToken(),hash=await sha256(token),id=crypto.randomUUID();
    const value=validated.value,expires=expiresSql(value.expires_in_days);
    await g.db.prepare('INSERT INTO cgma_ip_external_shares(id,token_hash,recipient_email,document_ids,purpose,created_by,expires_at) VALUES(?,?,?,?,?,?,?)')
      .bind(id,hash,value.recipient_email,JSON.stringify(value.document_ids),value.purpose,userEmail,expires).run();
    // This invitation does NOT modify the original Google Drive ACL. A human must grant
    // reader permission for exactly these files to the selected recipient.
    const link='https://cgma.or.kr/ip-share/?token='+token;
    return json({ok:true,id,share_url:link,recipient_email:value.recipient_email,expires_at:expires,document_ids:value.document_ids,drive_permission_required:true},201);
  }catch(error){console.warn('CGMA IP shares create failed',error?.message||error);return json({error:'archive_storage_unavailable'},503)}
}

export async function onRequestDelete({request,env}){
  const g=await guard(request,env);if(g.response)return g.response;
  const id=new URL(request.url).searchParams.get('id')||'';
  if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:'id_invalid'},400);
  try{
    await ensure(g.db);
    const result=await g.db.prepare('UPDATE cgma_ip_external_shares SET revoked_at=CURRENT_TIMESTAMP WHERE id=? AND revoked_at IS NULL').bind(id).run();
    if(Number(result.meta?.changes||0)!==1)return json({error:'share_not_found_or_revoked'},404);
    // Revokes only the EKODI invitation link, not existing Google Drive permissions.
    return json({ok:true,revoked:true,google_drive_acl_unchanged:true});
  }catch(error){console.warn('CGMA IP shares revoke failed',error?.message||error);return json({error:'archive_storage_unavailable'},503)}
}
