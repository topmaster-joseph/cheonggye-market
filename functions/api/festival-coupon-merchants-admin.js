import {apiReply,forwardFestival,requestBody,originAllowed} from '../_shared/cgma-festival-supabase.js';
export async function onRequestGet({request,env}){
 return forwardFestival('admin/coupon',request,{auth:true,env});
}
export async function onRequestPost({request,env}){
 if(!originAllowed(request))return apiReply({ok:false,error:'origin_invalid'},403);
 const body=await requestBody(request);
 if(!body)return apiReply({ok:false,error:'invalid_json'},400);
 const mapped={kind:'coupon',action:body.action,...(
 body.action==='set_intake'?{open:body.open}:{receipt:body.receipt,state:body.state}
 )};
 return forwardFestival('admin/action',request,{auth:true,body:mapped,env});
}
