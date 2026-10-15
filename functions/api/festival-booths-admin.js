import { cgmaAdmin } from '../_shared/cgma-admin.js';
import {EVENT_ID,json,clean,database,sameOrigin,parseJson,intakeStatus} from '../_shared/cgma-festival.js';
async function authorized(request){
  try{return await cgmaAdmin(request)}catch{return {allowed:false,status:503,reason:'auth_unavailable'}}
}
export async function onRequestGet({request,env}){
  const auth=await authorized(request);
  if(!auth.allowed)return json({ok:false,error:auth.reason},auth.status);
  const db=database(env);
  if(!db)return json({ok:false,error:'intake_unavailable'},503);
  try{
    const open=await intakeStatus(db);
    const r=await db.prepare(`SELECT receipt,shop_name,phone,item_description,membership_choice,
      membership_verified,other_support_selected,selection_state,created_at,updated_at
      FROM cgma_festival2026_applications WHERE event_id=? ORDER BY created_at DESC LIMIT 300`).bind(EVENT_ID).all();
    return json({ok:true,open,capacity:5,items:r.results||[]});
  }catch{return json({ok:false,error:'intake_unavailable'},503);}
}
export async function onRequestPost({request,env}){
  const auth=await authorized(request);
  if(!auth.allowed)return json({ok:false,error:auth.reason},auth.status);
  if(!sameOrigin(request))return json({ok:false,error:'origin_invalid'},403);
  const db=database(env);
  if(!db)return json({ok:false,error:'intake_unavailable'},503);
  const body=await parseJson(request);
  if(!body)return json({ok:false,error:'invalid_json'},400);
  try{
    if(body.action==='set_intake'&&typeof body.open==='boolean'){
      await db.prepare('UPDATE cgma_festival2026_settings SET intake_open=?,updated_at=CURRENT_TIMESTAMP WHERE event_id=?')
        .bind(body.open?1:0,EVENT_ID).run();
      return json({ok:true,open:await intakeStatus(db)});
    }
    const receipt=clean(body.receipt,48);
    if(!/^[0-9a-f-]{36}$/i.test(receipt))return json({ok:false,error:'invalid_receipt'},400);
    if(body.action==='verify_member'&&typeof body.verified==='boolean'){
      const r=await db.prepare(`UPDATE cgma_festival2026_applications SET membership_verified=?,updated_at=CURRENT_TIMESTAMP
        WHERE event_id=? AND receipt=? AND (selection_state!='selected' OR ?=1)`)
        .bind(body.verified?1:0,EVENT_ID,receipt,body.verified?1:0).run();
      return json({ok:Number(r.meta?.changes||0)>0},Number(r.meta?.changes||0)>0?200:409);
    }
    if(body.action==='other_support'&&typeof body.selected==='boolean'){
      const r=await db.prepare(`UPDATE cgma_festival2026_applications SET other_support_selected=?,updated_at=CURRENT_TIMESTAMP WHERE event_id=? AND receipt=?`)
        .bind(body.selected?1:0,EVENT_ID,receipt).run();
      return json({ok:Number(r.meta?.changes||0)>0},Number(r.meta?.changes||0)>0?200:404);
    }
    if(body.action==='select'&&['pending','selected','waitlist','rejected'].includes(body.state)){
      const r=await db.prepare(`UPDATE cgma_festival2026_applications SET selection_state=?,updated_at=CURRENT_TIMESTAMP
        WHERE event_id=? AND receipt=?
        AND (?!='selected' OR membership_verified=1)
        AND (?!='selected' OR selection_state='selected' OR (SELECT COUNT(*) FROM cgma_festival2026_applications WHERE event_id=? AND selection_state='selected')<5)`)
        .bind(body.state,EVENT_ID,receipt,body.state,body.state,EVENT_ID).run();
      if(Number(r.meta?.changes||0)===0)return json({ok:false,error:'selection_limit_or_membership'},409);
      return json({ok:true});
    }
    return json({ok:false,error:'invalid_action'},400);
  }catch{return json({ok:false,error:'intake_unavailable'},503);}
}
