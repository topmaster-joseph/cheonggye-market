import {sha256,isValidToken,selectedDocuments} from '../_shared/cgma-ip-share.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{
  'Cache-Control':'no-store, private','Pragma':'no-cache',
  'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',
  'X-Robots-Tag':'noindex, nofollow, noarchive'
}});

// Bearer invitation token is short-lived and only discloses the selected Drive
// destinations. Google Drive permissions remain independently enforced.
export async function onRequestGet({request,env}){
  const token=new URL(request.url).searchParams.get('token');
  if(!isValidToken(token))return json({error:'share_unavailable'},404);
  const db=env.cheonggye_market_notices;
  if(!db)return json({error:'service_unavailable'},503);
  try{
    const hash=await sha256(token);
    const row=await db.prepare('SELECT document_ids,purpose,expires_at FROM cgma_ip_external_shares WHERE token_hash=? AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP').bind(hash).first();
    if(!row)return json({error:'share_unavailable'},404);
    const docs=selectedDocuments(JSON.parse(row.document_ids));
    if(!docs.length)return json({error:'share_unavailable'},404);
    return json({
      ok:true,documents:docs,expires_at:row.expires_at,purpose:row.purpose,
      warning:'공유 링크는 Google Drive 파일 접근권한을 부여하지 않습니다. 수신자 계정에 개별 파일 읽기 권한이 있어야 열람할 수 있습니다. 파일 재배포·상업적 사용은 별도 허락이 필요합니다.'
    });
  }catch(error){console.warn('CGMA public IP invitation unavailable',error?.message||error);return json({error:'service_unavailable'},503)}
}
