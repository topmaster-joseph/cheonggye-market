import {cgmaAdmin} from '../_shared/cgma-admin.js';
import {ensureSurveyTables,aggregateSurvey,reply} from '../_shared/ai-education-store.js';
export async function onRequestGet({request,env}){
  const admin=await cgmaAdmin(request).catch(()=>({allowed:false,status:503,reason:'auth_unavailable'}));
  if(!admin.allowed)return reply({error:admin.reason||'tenant_admin_required'},admin.status||403);
  try{
    await ensureSurveyTables(env.cheonggye_market_notices);
    return reply({ok:true,scope:'tenant:cheonggye',...await aggregateSurvey(env.cheonggye_market_notices)});
  }catch(error){console.error('CGMA survey stats unavailable',String(error?.message||'').slice(0,100));return reply({error:'survey_stats_unavailable'},503)}
}
