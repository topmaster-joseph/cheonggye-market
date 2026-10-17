
const PROJECT_URL = Deno.env.get('SUPABASE_URL') || 'https://renzehysxirjilvdxacv.supabase.co';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const EVENT = 'cgma-du-dream-2026';
const ORIGINS = new Set(['https://cgma.or.kr','https://www.cgma.or.kr','https://ekodi.kr','https://cheonggye-market.pages.dev']);
const columns = {
 booth:'cgma_festival_2026_booth',
 coupon:'cgma_festival_2026_coupon_merchant'
};
const response=(body,status=200,origin='')=>new Response(JSON.stringify(body),{
 status,headers:{
 'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
 'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
 ...(ORIGINS.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin'}:{})
 }});
const clean=(v,max)=>typeof v==='string'?v.trim().slice(0,max+1):'';
const phoneOf=v=>{
 const p=clean(v,30).replace(/[\s()-]/g,'');
 return /^0\d{8,10}$/.test(p)?p:null;
};
const validUuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
async function db(path,method='GET',body=null,prefer='return=representation'){
 if(!SERVICE_KEY)throw Error('backend_unavailable');
 const headers={'apikey':SERVICE_KEY,'authorization':'Bearer '+SERVICE_KEY,'accept':'application/json'};
 if(method!=='GET'){headers['content-type']='application/json';headers['prefer']=prefer;}
 const res=await fetch(PROJECT_URL+'/rest/v1/'+path,{method,headers,body:body===null?undefined:JSON.stringify(body)});
 const text=await res.text();
 let json;try{json=text?JSON.parse(text):null}catch{json=null}
 if(!res.ok){
  const err=new Error('database_request_failed');err.status=res.status;err.dbCode=json?.code;
  err.dbMessage=String(json?.message||'').slice(0,120);
  throw err;
 }
 return json;
}
async function setting(){
 const data=await db('cgma_festival_2026_settings?select=booth_open,coupon_open&event_id=eq.'+EVENT+'&limit=1');
 if(!Array.isArray(data)||!data[0])throw Error('setting_missing');
 return data[0];
}
async function administrator(request){
 const authorization=request.headers.get('authorization')||'';
 if(!/^Bearer\s+\S+$/i.test(authorization))return false;
 if(!ANON_KEY)return false;
 const h={Authorization:authorization,apikey:ANON_KEY};
 const user=await fetch(PROJECT_URL+'/auth/v1/user',{headers:h}).catch(()=>null);
 if(!user?.ok)return false;
 // Existing CGMA manager authorization contract, not email matching.
 const access=await fetch(PROJECT_URL+'/functions/v1/membership-api/pending?tenant=cheonggye',{headers:h}).catch(()=>null);
 if(!access?.ok)return false;
 const value=await access.json().catch(()=>null);
 return !!value?.reviewer&&['platform','tenant'].includes(value?.reviewer?.authority);
}
function expired(){return Date.now()>=Date.parse('2027-01-28T00:00:00+09:00');}
async function handler(request){
 const origin=request.headers.get('origin')||'';
 if(request.method==='OPTIONS'){
  if(!ORIGINS.has(origin))return response({ok:false,error:'origin_invalid'},403,origin);
  return new Response(null,{status:204,headers:{
   'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS',
   'access-control-allow-headers':'authorization,apikey,content-type','access-control-max-age':'600','vary':'Origin'
  }});
 }
 const path=new URL(request.url).pathname.split('/').filter(Boolean);
 // The function runtime sees /festival-intake/... or /functions/v1/festival-intake/...
 const start=path.indexOf('cgma-festival-intake');
 const route=path.slice(start<0?0:start+1).join('/');
 if(!SERVICE_KEY)return response({ok:false,error:'backend_unavailable'},503,origin);
 if(request.method==='GET'&&route==='status'){
  try{
   const s=await setting();
   return response({ok:true,boothOpen:s.booth_open,couponOpen:s.coupon_open,couponMembershipEnabled:true,capacity:5,couponValue:5000,deadline:null},200,origin);
  }catch{return response({ok:false,error:'backend_unavailable'},503,origin);}
 }
 if(request.method==='POST'&&route.startsWith('apply/')){
  if(!ORIGINS.has(origin))return response({ok:false,error:'origin_invalid'},403,origin);
  if(expired())return response({ok:false,error:'event_closed'},410,origin);
  const len=Number(request.headers.get('content-length')||0);
  if(len>8192)return response({ok:false,error:'too_large'},413,origin);
  const raw=await request.text();
  if(raw.length>8192)return response({ok:false,error:'too_large'},413,origin);
  let v;try{v=JSON.parse(raw)}catch{return response({ok:false,error:'invalid_json'},400,origin);}
  if(!v||typeof v!=='object'||Array.isArray(v))return response({ok:false,error:'invalid_json'},400,origin);
  if(v.website)return response({ok:false,error:'invalid_submission'},400,origin);
  const kind=route.split('/')[1];if(!['booth','coupon'].includes(kind))return response({ok:false,error:'invalid_kind'},404,origin);
  const shop=clean(v.shop,80),phone=phoneOf(v.phone),items=clean(v.items,500);
  if(!shop||shop.length>80||!phone||!items||items.length>500||v.privacyConsent!==true)return response({ok:false,error:'required_fields'},400,origin);
  const record={event_id:EVENT,shop_name:shop,phone,items,privacy_consented_at:new Date().toISOString()};
  if(kind==='booth'){
   if(!['regular','joining'].includes(v.membership))return response({ok:false,error:'membership_required'},400,origin);
   record.membership_choice=v.membership;
  }else{
   const location=clean(v.location,200);
   if(!location||location.length>200||v.couponAcceptance!==true)return response({ok:false,error:'required_fields'},400,origin);
   // Legacy form requests may omit membership during the phased rollout.
   if(v.membership!==undefined&&v.membership!==null){
    if(!['regular','joining'].includes(v.membership))return response({ok:false,error:'membership_required'},400,origin);
    record.membership_choice=v.membership;
   }
   record.location_text=location;record.accepts_coupon_5000=true;
  }
  try{
   const s=await setting();
   if(kind==='booth'&&!s.booth_open||kind==='coupon'&&!s.coupon_open)return response({ok:false,error:'intake_closed'},409,origin);
   const result=await db(columns[kind]+'?select=receipt','POST',record);
   if(!Array.isArray(result)||!result[0]?.receipt)throw Error('missing_receipt');
   return response({ok:true,receipt:result[0].receipt,kind,...(kind==='booth'?{membershipApplicationRequired:v.membership==='joining'}:{couponValue:5000,membershipApplicationRequired:v.membership==='joining'})},201,origin);
  }catch(error){
   if(error.dbCode==='23505')return response({ok:false,error:'duplicate_application'},409,origin);
   if(error.dbMessage?.includes('festival_intake_closed'))return response({ok:false,error:'intake_closed'},409,origin);
   return response({ok:false,error:'backend_unavailable'},503,origin);
  }
 }
 if(route.startsWith('admin/')){
  if(!await administrator(request))return response({ok:false,error:'tenant_admin_required'},403,origin);
  if(request.method==='GET'&&['admin/booth','admin/coupon'].includes(route)){
   const kind=route.split('/')[1];
   const cols=kind==='booth'
    ?'receipt,shop_name,phone,items,membership_choice,membership_verified,other_support_selected,selection_state,selected_slot,created_at'
    :'receipt,shop_name,phone,location_text,items,membership_choice,review_state,created_at';
   try{
    const [s,list]=await Promise.all([
      setting(),
      db(columns[kind]+'?select='+cols+'&event_id=eq.'+EVENT+'&order=created_at.desc&limit=300')
    ]);
    return response({ok:true,open:kind==='booth'?s.booth_open:s.coupon_open,capacity:kind==='booth'?5:null,items:list||[]},200,origin);
   }catch{return response({ok:false,error:'backend_unavailable'},503,origin);}
  }
  if(request.method==='POST'&&route==='admin/action'){
   if(!ORIGINS.has(origin))return response({ok:false,error:'origin_invalid'},403,origin);
   let v;try{v=await request.json()}catch{return response({ok:false,error:'invalid_json'},400,origin);}
   if(v?.action==='set_intake'&&['booth','coupon'].includes(v.kind)&&typeof v.open==='boolean'){
    const field=v.kind==='booth'?'booth_open':'coupon_open';
    try{
     await db('cgma_festival_2026_settings?event_id=eq.'+EVENT,'PATCH',{[field]:v.open,updated_at:new Date().toISOString()},'return=minimal');
     return response({ok:true,open:v.open},200,origin);
    }catch{return response({ok:false,error:'backend_unavailable'},503,origin);}
   }
   if(!validUuid(v?.receipt)||!['booth','coupon'].includes(v.kind))return response({ok:false,error:'invalid_request'},400,origin);
   try{
    if(v.kind==='booth'&&['verify_member','other_support','select'].includes(v.action)){
     if(v.action==='select'&&!['pending','selected','waitlist','rejected'].includes(v.state))return response({ok:false,error:'invalid_state'},400,origin);
     if(v.action!=='select'&&typeof v.value!=='boolean')return response({ok:false,error:'invalid_value'},400,origin);
     await db('rpc/cgma_festival_2026_admin_update_booth','POST',{
      p_receipt:v.receipt,p_action:v.action,p_value:String(v.action==='select'?v.state:v.value)
     });
     return response({ok:true},200,origin);
    }
    if(v.kind==='coupon'&&v.action==='review'&&['pending','approved','rejected'].includes(v.state)){
     const result=await db('cgma_festival_2026_coupon_merchant?receipt=eq.'+v.receipt+'&select=receipt','PATCH',{
      review_state:v.state,updated_at:new Date().toISOString()
     });
     if(!result?.length)return response({ok:false,error:'not_found'},404,origin);
     return response({ok:true},200,origin);
    }
    return response({ok:false,error:'invalid_action'},400,origin);
   }catch(error){
    if(error.dbMessage?.includes('selection_limit'))return response({ok:false,error:'selection_limit'},409,origin);
    if(error.dbMessage?.includes('membership_not_verified'))return response({ok:false,error:'membership_not_verified'},409,origin);
    return response({ok:false,error:'backend_unavailable'},503,origin);
   }
  }
 }
 return response({ok:false,error:'not_found'},404,origin);
}
Deno.serve(async request=>{
 try{return await handler(request);}
 catch{return response({ok:false,error:'unavailable'},503,request.headers.get('origin')||'');}
});
