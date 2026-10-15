import {apiReply,forwardFestival,requestBody,originAllowed} from '../_shared/cgma-festival-supabase.js';
export async function onRequestGet({request,env}){
 const response=await forwardFestival('status',request,{env});
 if(!response.ok)return response;
 const s=await response.json();
 return apiReply({ok:true,open:s.couponOpen===true,eventId:'cgma-du-dream-2026',couponValue:5000,deadline:null});
}
export async function onRequestPost({request,env}){
 if(!originAllowed(request))return apiReply({ok:false,error:'origin_invalid'},403);
 const body=await requestBody(request);
 if(!body)return apiReply({ok:false,error:'invalid_json'},400);
 return forwardFestival('apply/coupon',request,{body,env});
}
