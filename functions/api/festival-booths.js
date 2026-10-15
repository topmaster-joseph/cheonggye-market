import {EVENT_ID,json,clean,database,sameOrigin,parseJson,intakeStatus,ensureFestivalSchema,normalizePhone} from '../_shared/cgma-festival.js';
export async function onRequestGet({env}){
  const db=database(env);
  if(!db)return json({ok:false,error:'intake_unavailable'},503);
  try{await ensureFestivalSchema(db);}catch{return json({ok:false,error:'schema_not_ready'},503);}
  try{return json({ok:true,open:await intakeStatus(db),eventId:EVENT_ID,capacity:5,deadline:null});}
  catch{return json({ok:false,error:'settings_not_ready'},503);}
}
export async function onRequestPost({request,env}){
  if(!sameOrigin(request))return json({ok:false,error:'origin_invalid'},403);
  const db=database(env);
  if(!db)return json({ok:false,error:'intake_unavailable'},503);
  const body=await parseJson(request);
  if(!body)return json({ok:false,error:'invalid_json'},400);
  const shop=clean(body.shop,80),phone=normalizePhone(body.phone),items=clean(body.items,500);
  const membership=body.membership;
  if(body.website) return json({ok:false,error:'invalid_submission'},400); // hidden anti-bot field
  if(!shop||shop.length>80||!phone||!items||items.length>500||!['regular','joining'].includes(membership)||body.privacyConsent!==true)
    return json({ok:false,error:'required_fields'},400);
  const receipt=crypto.randomUUID();
  try{
    await ensureFestivalSchema(db);
    const result=await db.prepare(`INSERT OR IGNORE INTO cgma_festival2026_applications
    (receipt,event_id,shop_name,phone,item_description,membership_choice,privacy_consented_at)
    SELECT ?,?,?,?,?,?,CURRENT_TIMESTAMP
    WHERE EXISTS(SELECT 1 FROM cgma_festival2026_settings WHERE event_id=? AND intake_open=1)`)
      .bind(receipt,EVENT_ID,shop,phone,items,membership,EVENT_ID).run();
    if(Number(result.meta?.changes||0)===1)return json({ok:true,receipt,membershipApplicationRequired:membership==='joining'},201);
    if(!await intakeStatus(db))return json({ok:false,error:'intake_closed'},409);
    return json({ok:false,error:'duplicate_application'},409);
  }catch{
    return json({ok:false,error:'intake_unavailable'},503);
  }
}
