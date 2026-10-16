import {cgmaAdmin} from '../_shared/cgma-admin.js';
import {ensureSurveyTables,aggregateSurvey,newShare,listShares,revokeShare,shareActive,readJson,reply,sameSiteOrigin} from '../_shared/ai-education-store.js';
async function allowedAdmin(request){
  const admin=await cgmaAdmin(request).catch(()=>({allowed:false,status:503,reason:'auth_unavailable'}));
  return admin.allowed?{allowed:true}:{allowed:false,status:admin.status||403,error:admin.reason||'tenant_admin_required'};
}
export async function onRequestGet({request,env}){
  const token=new URL(request.url).searchParams.get('token');
  if(token){
    // Share responses contain aggregates ONLY. Never return free-text notes or raw answers.
    try{
      const db=env.cheonggye_market_notices;
      await ensureSurveyTables(db);
      if(!await shareActive(db,token))return reply({error:'share_expired_or_revoked'},404);
      return reply({ok:true,shared:true,...await aggregateSurvey(db,{shared:true})});
    }catch{return reply({error:'share_unavailable'},503)}
  }
  const admin=await allowedAdmin(request);
  if(!admin.allowed)return reply({error:admin.error},admin.status);
  try{
    const db=env.cheonggye_market_notices;await ensureSurveyTables(db);
    return reply({ok:true,items:await listShares(db)});
  }catch{return reply({error:'share_store_unavailable'},503)}
}
export async function onRequestPost({request,env}){
  if(!sameSiteOrigin(request))return reply({error:'origin_not_allowed'},403);
  const admin=await allowedAdmin(request);
  if(!admin.allowed)return reply({error:admin.error},admin.status);
  const data=await readJson(request);if(data.error)return reply({error:data.error},data.status);
  if(data.value?.action!=='create')return reply({error:'unknown_action'},400);
  try{
    const db=env.cheonggye_market_notices;await ensureSurveyTables(db);
    return reply({ok:true,share:await newShare(db)},201);
  }catch{return reply({error:'share_create_unavailable'},503)}
}
export async function onRequestDelete({request,env}){
  if(!sameSiteOrigin(request))return reply({error:'origin_not_allowed'},403);
  const admin=await allowedAdmin(request);
  if(!admin.allowed)return reply({error:admin.error},admin.status);
  const data=await readJson(request);if(data.error)return reply({error:data.error},data.status);
  try{
    const db=env.cheonggye_market_notices;await ensureSurveyTables(db);
    if(!await revokeShare(db,data.value?.id))return reply({error:'share_not_found'},404);
    return reply({ok:true,revoked:true});
  }catch{return reply({error:'share_revoke_unavailable'},503)}
}
