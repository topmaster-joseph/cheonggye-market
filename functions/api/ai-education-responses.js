import {ensureSurveyTables,readJson,reply,sameSiteOrigin,saveSurvey,validateSurvey} from '../_shared/ai-education-store.js';
export async function onRequestPost({request,env}){
  if(!sameSiteOrigin(request))return reply({error:'origin_not_allowed'},403);
  const data=await readJson(request);
  if(data.error)return reply({error:data.error},data.status);
  // Honeypot submissions are discarded and never entered into the count.
  if(typeof data.value?.website==='string'&&data.value.website.trim())return reply({error:'submission_rejected'},400);
  const checked=validateSurvey(data.value);
  if(checked.error)return reply({error:checked.error},400);
  try{
    const db=env.cheonggye_market_notices;
    await ensureSurveyTables(db);
    await saveSurvey(db,checked);
    return reply({ok:true,saved:true,updated_existing_or_new:true,survey_version:checked.version},201);
  }catch(error){
    console.error('CGMA survey store unavailable',String(error?.message||'').slice(0,100));
    return reply({error:'survey_store_unavailable'},503);
  }
}
export async function onRequestGet(){return reply({error:'method_not_allowed'},405)}
