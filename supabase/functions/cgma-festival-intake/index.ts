// cgma-festival-intake — EKODI production Supabase Edge Function (renzehysxirjilvdxacv).
// Public: festival status, booth/coupon applications, read-only scoped share view.
// Admin (existing CGMA manager authority via membership-api, checked on every request):
// lists, reviews, intake switch, coupon bulk intake, bulk review, scoped shares, activity log.
// Plain JavaScript in a .ts file so Node (CI) can import createHandler() for tests.

const EVENT = 'cgma-du-dream-2026';
const ORIGINS = new Set(['https://cgma.or.kr','https://www.cgma.or.kr','https://ekodi.kr','https://cheonggye-market.pages.dev']);
const TABLES = {booth:'cgma_festival_2026_booth',coupon:'cgma_festival_2026_coupon_merchant'};
const SHARE_FIELDS = ['shop_name','location_text','phone','items','created_at','review_state'];
const PII_FIELDS = ['phone','location_text'];
const PUBLIC_BODY_LIMIT = 8192;
const ADMIN_BODY_LIMIT = 600000;
const PBKDF2_ITERATIONS = 100000;

const encoder = new TextEncoder();
const clean = (v,max)=>typeof v==='string'?v.trim().slice(0,max+1):'';
const phoneOf = v=>{
  const p = clean(v,30).replace(/[\s().-]/g,'');
  return /^0\d{8,10}$/.test(p)?p:null;
};
const validUuid = v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const hex = bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const base64url = bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export async function sha256Hex(text){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(text)));}
export async function passwordHash(password,saltHex){
  const key = await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g).map(h=>parseInt(h,16)));
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:PBKDF2_ITERATIONS},key,256));
}
function sameHex(a,b){
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;
  let diff = 0;for(let i=0;i<a.length;i++)diff |= a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
async function readLimited(request,limit){
  const len = Number(request.headers.get('content-length')||0);
  if(len>limit)return {error:'too_large',status:413};
  const raw = await request.text();
  if(raw.length>limit)return {error:'too_large',status:413};
  try{
    const value = JSON.parse(raw);
    if(!value||typeof value!=='object'||Array.isArray(value))return {error:'invalid_json',status:400};
    return {value};
  }catch{return {error:'invalid_json',status:400};}
}

export function createHandler({projectUrl,serviceKey,anonKey,fetchImpl=fetch,now=()=>Date.now()}){
  const response = (body,status=200,origin='')=>new Response(JSON.stringify(body),{
    status,headers:{
      'content-type':'application/json; charset=utf-8','cache-control':'private, no-store',
      'x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-robots-tag':'noindex, nofollow',
      ...(ORIGINS.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin'}:{})
    }});

  async function db(path,method='GET',body=null,prefer='return=representation'){
    if(!serviceKey)throw Error('backend_unavailable');
    const headers = {'apikey':serviceKey,'authorization':'Bearer '+serviceKey,'accept':'application/json'};
    if(method!=='GET'){headers['content-type']='application/json';headers['prefer']=prefer;}
    const res = await fetchImpl(projectUrl+'/rest/v1/'+path,{method,headers,body:body===null?undefined:JSON.stringify(body)});
    const text = await res.text();
    let json;try{json = text?JSON.parse(text):null}catch{json = null}
    if(!res.ok){
      const err = new Error('database_request_failed');err.status = res.status;err.dbCode = json?.code;
      err.dbMessage = String(json?.message||'').slice(0,120);
      throw err;
    }
    return json;
  }
  const rpc = (name,args)=>db('rpc/'+name,'POST',args);
  async function setting(){
    const data = await db('cgma_festival_2026_settings?select=booth_open,coupon_open&event_id=eq.'+EVENT+'&limit=1');
    if(!Array.isArray(data)||!data[0])throw Error('setting_missing');
    return data[0];
  }
  async function note(actor,action,count,detail){
    try{await db('cgma_festival_2026_admin_log','POST',{actor_id:actor.id,actor_email:actor.email,action,target_count:count,detail},'return=minimal');}
    catch{/* the action itself already succeeded; a missing log line must not undo it */}
  }
  // Existing CGMA manager authorization contract (membership-api reviewer), never email matching.
  async function administrator(request){
    const authorization = request.headers.get('authorization')||'';
    if(!/^Bearer\s+\S+$/i.test(authorization)||!anonKey)return null;
    const h = {Authorization:authorization,apikey:anonKey};
    const userRes = await fetchImpl(projectUrl+'/auth/v1/user',{headers:h}).catch(()=>null);
    if(!userRes?.ok)return null;
    const user = await userRes.json().catch(()=>null);
    const access = await fetchImpl(projectUrl+'/functions/v1/membership-api/pending?tenant=cheonggye',{headers:h}).catch(()=>null);
    if(!access?.ok)return null;
    const value = await access.json().catch(()=>null);
    const authority = value?.reviewer?.authority;
    if(!['platform','tenant'].includes(authority))return null;
    return {id:validUuid(user?.id)?user.id:null,email:typeof user?.email==='string'?user.email.slice(0,200):null,authority};
  }
  const expired = ()=>now()>=Date.parse('2027-01-28T00:00:00+09:00');

  async function shareView(request,origin){
    if(!ORIGINS.has(origin))return response({ok:false,error:'origin_invalid'},403,origin);
    const body = await readLimited(request,2048);
    if(body.error)return response({ok:false,error:body.error},body.status,origin);
    const token = body.value.token;
    if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return response({ok:false,error:'share_not_found'},404,origin);
    const tokenHash = await sha256Hex(token);
    const found = await db('cgma_festival_2026_share?select=id,label,fields,expires_at,revoked_at,locked_until,password_salt,password_hash,allow_download,includes_pii&token_hash=eq.'+tokenHash+'&limit=1');
    const share = Array.isArray(found)?found[0]:null;
    if(!share)return response({ok:false,error:'share_not_found'},404,origin);
    const record = outcome=>rpc('cgma_festival_2026_share_record',{p_id:share.id,p_outcome:outcome}).catch(()=>null);
    if(share.revoked_at){await record('revoked');return response({ok:false,error:'share_revoked'},410,origin);}
    if(Date.parse(share.expires_at)<=now()){await record('expired');return response({ok:false,error:'share_expired'},410,origin);}
    if(share.locked_until&&Date.parse(share.locked_until)>now()){await record('locked');return response({ok:false,error:'share_locked'},429,origin);}
    if(share.password_hash){
      const password = typeof body.value.password==='string'?body.value.password.slice(0,200):'';
      if(!password){await record('password_required');return response({ok:false,error:'password_required',label:share.label},401,origin);}
      const attempt = await passwordHash(password,share.password_salt);
      if(!sameHex(attempt,share.password_hash)){
        const result = await record('password_invalid');
        if(result?.locked_until)return response({ok:false,error:'share_locked'},429,origin);
        return response({ok:false,error:'password_invalid',label:share.label},401,origin);
      }
    }
    const items = await rpc('cgma_festival_2026_share_rows',{p_id:share.id});
    await record('ok');
    const fields = (share.fields||[]).filter(f=>SHARE_FIELDS.includes(f));
    return response({ok:true,label:share.label,fields,expiresAt:share.expires_at,allowDownload:share.allow_download===true,
      items:Array.isArray(items)?items.map(row=>Object.fromEntries(fields.map(f=>[f,row?.[f]??null]))):[]},200,origin);
  }

  async function couponAdminAction(v,actor,origin){
    if(v.action==='review'){
      if(!validUuid(v.receipt)||!['pending','approved','rejected'].includes(v.state))return response({ok:false,error:'invalid_request'},400,origin);
      const r = await rpc('cgma_festival_2026_coupon_review',{p_receipts:[v.receipt],p_state:v.state,p_actor_id:actor.id,p_actor_email:actor.email});
      if(!r?.found)return response({ok:false,error:'not_found'},404,origin);
      return response({ok:true,changed:r.changed},200,origin);
    }
    if(v.action==='review_bulk'){
      const receipts = Array.isArray(v.receipts)?[...new Set(v.receipts)]:[];
      if(!receipts.length||receipts.length>500||!receipts.every(validUuid)||!['pending','approved','rejected'].includes(v.state))
        return response({ok:false,error:'invalid_request'},400,origin);
      const r = await rpc('cgma_festival_2026_coupon_review',{p_receipts:receipts,p_state:v.state,p_actor_id:actor.id,p_actor_email:actor.email});
      return response({ok:true,requested:receipts.length,found:r?.found??0,changed:r?.changed??0},200,origin);
    }
    if(v.action==='import'){
      if(!validUuid(v.key)||!Array.isArray(v.rows)||v.rows.length<1||v.rows.length>500)return response({ok:false,error:'invalid_request'},400,origin);
      if(v.commit===true&&v.consentAttested!==true)return response({ok:false,error:'consent_attestation_required'},400,origin);
      const rows = v.rows.map((row,index)=>({
        i:Number.isInteger(row?.i)?row.i:index+1,shop:clean(row?.shop,200),phone:clean(row?.phone,40),
        location:clean(row?.location,400),items:clean(row?.items,1000),confirm:row?.confirm===true
      }));
      const r = await rpc('cgma_festival_2026_coupon_import',{p_key:v.key,p_rows:rows,p_commit:v.commit===true,p_actor_id:actor.id,p_actor_email:actor.email});
      return response(r,200,origin);
    }
    if(v.action==='share_create'){
      const label = clean(v.label,80);
      const fields = Array.isArray(v.fields)?[...new Set(v.fields)].filter(f=>SHARE_FIELDS.includes(f)):[];
      const receipts = Array.isArray(v.receipts)?[...new Set(v.receipts)].filter(validUuid):[];
      const days = Number(v.expiresInDays);
      const pii = fields.some(f=>PII_FIELDS.includes(f));
      const password = typeof v.password==='string'?v.password:'';
      const basis = clean(v.piiBasis,300);
      if(!label||label.length>80||!fields.length||fields.length!==(v.fields||[]).length||!receipts.length||receipts.length>500)
        return response({ok:false,error:'invalid_request'},400,origin);
      if(!Number.isInteger(days)||days<1||days>(pii?7:30))return response({ok:false,error:'invalid_expiry'},400,origin);
      if(password&&(password.length<8||password.length>200))return response({ok:false,error:'password_too_short'},400,origin);
      if(pii&&(basis.length<5||basis.length>300))return response({ok:false,error:'pii_basis_required'},400,origin);
      if(pii&&!password)return response({ok:false,error:'pii_password_required'},400,origin);
      const token = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const salt = password?hex(crypto.getRandomValues(new Uint8Array(16))):null;
      const r = await rpc('cgma_festival_2026_share_create',{
        p_token_hash:await sha256Hex(token),p_label:label,p_fields:fields,p_receipts:receipts,p_days:days,
        p_pii_basis:pii?basis:null,p_salt:salt,p_hash:password?await passwordHash(password,salt):null,
        p_allow_download:v.allowDownload===true,p_actor_id:actor.id,p_actor_email:actor.email
      });
      // The raw token exists only in this response; the database keeps its SHA-256.
      return response({ok:true,token,share:r},201,origin);
    }
    if(v.action==='share_revoke'){
      if(!validUuid(v.id))return response({ok:false,error:'invalid_request'},400,origin);
      const r = await rpc('cgma_festival_2026_share_revoke',{p_id:v.id,p_actor_id:actor.id,p_actor_email:actor.email});
      return response({ok:true,revoked:r?.revoked===true},200,origin);
    }
    if(v.action==='log_export'){
      const format = ['csv','xlsx'].includes(v.format)?v.format:null;
      const count = Number(v.count);
      if(!format||!Number.isInteger(count)||count<0||count>5000)return response({ok:false,error:'invalid_request'},400,origin);
      const scope = ['applicants','import_result','share'].includes(v.scope)?v.scope:'applicants';
      await note(actor,'export',count,{format,scope});
      return response({ok:true},200,origin);
    }
    return response({ok:false,error:'invalid_action'},400,origin);
  }

  async function handler(request){
    const origin = request.headers.get('origin')||'';
    if(request.method==='OPTIONS'){
      if(!ORIGINS.has(origin))return response({ok:false,error:'origin_invalid'},403,origin);
      return new Response(null,{status:204,headers:{
        'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS',
        'access-control-allow-headers':'authorization,apikey,content-type','access-control-max-age':'600','vary':'Origin'
      }});
    }
    const path = new URL(request.url).pathname.split('/').filter(Boolean);
    // The function runtime sees /cgma-festival-intake/... or /functions/v1/cgma-festival-intake/...
    const start = path.indexOf('cgma-festival-intake');
    const route = path.slice(start<0?0:start+1).join('/');
    if(!serviceKey)return response({ok:false,error:'backend_unavailable'},503,origin);
    if(request.method==='GET'&&route==='status'){
      try{
        const s = await setting();
        return response({ok:true,boothOpen:s.booth_open,couponOpen:s.coupon_open,capacity:5,couponValue:5000,deadline:null},200,origin);
      }catch{return response({ok:false,error:'backend_unavailable'},503,origin);}
    }
    // Public approved-merchant list: shop name, location and items only — never phone, receipt or applicant data.
    if(request.method==='GET'&&route==='public/coupon-merchants'){
      try{
        const rows = await db('cgma_festival_2026_coupon_public?select=shop_name,location_text,items&order=shop_name.asc&limit=500');
        const merchants = (Array.isArray(rows)?rows:[]).map(r=>({shopName:String(r.shop_name??''),location:String(r.location_text??''),items:String(r.items??'')}));
        const res = response({ok:true,eventId:EVENT,couponValue:5000,count:merchants.length,merchants},200,origin);
        res.headers.set('cache-control','public, max-age=60');
        return res;
      }catch{return response({ok:false,error:'backend_unavailable'},503,origin);}
    }
    if(request.method==='POST'&&route==='share/view'){
      try{return await shareView(request,origin);}
      catch{return response({ok:false,error:'backend_unavailable'},503,origin);}
    }
    if(request.method==='POST'&&route.startsWith('apply/')){
      if(!ORIGINS.has(origin))return response({ok:false,error:'origin_invalid'},403,origin);
      if(expired())return response({ok:false,error:'event_closed'},410,origin);
      const body = await readLimited(request,PUBLIC_BODY_LIMIT);
      if(body.error)return response({ok:false,error:body.error},body.status,origin);
      const v = body.value;
      if(v.website)return response({ok:false,error:'invalid_submission'},400,origin);
      const kind = route.split('/')[1];if(!['booth','coupon'].includes(kind))return response({ok:false,error:'invalid_kind'},404,origin);
      const shop = clean(v.shop,80),phone = phoneOf(v.phone),items = clean(v.items,500);
      if(!shop||shop.length>80||!phone||!items||items.length>500||v.privacyConsent!==true)return response({ok:false,error:'required_fields'},400,origin);
      const record = {event_id:EVENT,shop_name:shop,phone,items,privacy_consented_at:new Date(now()).toISOString()};
      if(kind==='booth'){
        if(!['regular','joining'].includes(v.membership))return response({ok:false,error:'membership_required'},400,origin);
        record.membership_choice = v.membership;
      }else{
        const location = clean(v.location,200);
        if(!location||location.length>200||v.couponAcceptance!==true)return response({ok:false,error:'required_fields'},400,origin);
        record.location_text = location;record.accepts_coupon_5000 = true;
      }
      try{
        const s = await setting();
        if(kind==='booth'&&!s.booth_open||kind==='coupon'&&!s.coupon_open)return response({ok:false,error:'intake_closed'},409,origin);
        const result = await db(TABLES[kind]+'?select=receipt','POST',record);
        if(!Array.isArray(result)||!result[0]?.receipt)throw Error('missing_receipt');
        return response({ok:true,receipt:result[0].receipt,kind,...(kind==='booth'?{membershipApplicationRequired:v.membership==='joining'}:{couponValue:5000})},201,origin);
      }catch(error){
        if(error.dbCode==='23505')return response({ok:false,error:'duplicate_application'},409,origin);
        if(error.dbMessage?.includes('festival_intake_closed'))return response({ok:false,error:'intake_closed'},409,origin);
        return response({ok:false,error:'backend_unavailable'},503,origin);
      }
    }
    if(route.startsWith('admin/')){
      const actor = await administrator(request);
      if(!actor)return response({ok:false,error:'tenant_admin_required'},403,origin);
      if(request.method==='GET'&&['admin/booth','admin/coupon'].includes(route)){
        const kind = route.split('/')[1];
        const cols = kind==='booth'
          ?'receipt,shop_name,phone,items,membership_choice,membership_verified,other_support_selected,selection_state,selected_slot,created_at'
          :'receipt,shop_name,phone,location_text,items,review_state,intake_source,created_at,updated_at';
        try{
          const [s,list] = await Promise.all([
            setting(),
            db(TABLES[kind]+'?select='+cols+'&event_id=eq.'+EVENT+'&order=created_at.desc&limit=1000')
          ]);
          return response({ok:true,open:kind==='booth'?s.booth_open:s.coupon_open,capacity:kind==='booth'?5:null,items:list||[],
            admin:{email:actor.email,authority:actor.authority}},200,origin);
        }catch{return response({ok:false,error:'backend_unavailable'},503,origin);}
      }
      if(request.method==='GET'&&route==='admin/coupon/shares'){
        try{
          const list = await db('cgma_festival_2026_share?select=id,label,fields,receipts,includes_pii,pii_basis,allow_download,created_at,expires_at,revoked_at,created_by_email,view_count,last_viewed_at,locked_until,password_hash&event_id=eq.'+EVENT+'&order=created_at.desc&limit=100');
          return response({ok:true,items:(list||[]).map(s=>({id:s.id,label:s.label,fields:s.fields,count:(s.receipts||[]).length,
            includesPii:s.includes_pii,piiBasis:s.pii_basis,allowDownload:s.allow_download,createdAt:s.created_at,expiresAt:s.expires_at,
            revokedAt:s.revoked_at,createdBy:s.created_by_email,viewCount:s.view_count,lastViewedAt:s.last_viewed_at,
            lockedUntil:s.locked_until,hasPassword:!!s.password_hash}))},200,origin);
        }catch{return response({ok:false,error:'backend_unavailable'},503,origin);}
      }
      if(request.method==='GET'&&route==='admin/coupon/log'){
        try{
          const [log,batches] = await Promise.all([
            db('cgma_festival_2026_admin_log?select=at,actor_email,action,target_count,detail&event_id=eq.'+EVENT+'&order=at.desc&limit=100'),
            db('cgma_festival_2026_import_batch?select=idempotency_key,created_at,actor_email,row_count,created_count,skipped_count,failed_count&event_id=eq.'+EVENT+'&order=created_at.desc&limit=30')
          ]);
          return response({ok:true,log:log||[],batches:batches||[]},200,origin);
        }catch{return response({ok:false,error:'backend_unavailable'},503,origin);}
      }
      if(request.method==='POST'&&route==='admin/action'){
        if(!ORIGINS.has(origin))return response({ok:false,error:'origin_invalid'},403,origin);
        const body = await readLimited(request,ADMIN_BODY_LIMIT);
        if(body.error)return response({ok:false,error:body.error},body.status,origin);
        const v = body.value;
        try{
          if(v.action==='set_intake'&&['booth','coupon'].includes(v.kind)&&typeof v.open==='boolean'){
            const field = v.kind==='booth'?'booth_open':'coupon_open';
            await db('cgma_festival_2026_settings?event_id=eq.'+EVENT,'PATCH',{[field]:v.open,updated_at:new Date(now()).toISOString()},'return=minimal');
            await note(actor,'set_intake',0,{kind:v.kind,open:v.open});
            return response({ok:true,open:v.open},200,origin);
          }
          if(v.kind==='coupon')return await couponAdminAction(v,actor,origin);
          if(v.kind==='booth'&&validUuid(v.receipt)&&['verify_member','other_support','select'].includes(v.action)){
            if(v.action==='select'&&!['pending','selected','waitlist','rejected'].includes(v.state))return response({ok:false,error:'invalid_state'},400,origin);
            if(v.action!=='select'&&typeof v.value!=='boolean')return response({ok:false,error:'invalid_value'},400,origin);
            await rpc('cgma_festival_2026_admin_update_booth',{p_receipt:v.receipt,p_action:v.action,p_value:String(v.action==='select'?v.state:v.value)});
            return response({ok:true},200,origin);
          }
          return response({ok:false,error:'invalid_request'},400,origin);
        }catch(error){
          for(const code of ['selection_limit','membership_not_verified','no_matching_applicants','row_limit','invalid_expiry'])
            if(error.dbMessage?.includes(code))return response({ok:false,error:code},409,origin);
          if(error.dbCode==='23514')return response({ok:false,error:'policy_violation'},400,origin);
          return response({ok:false,error:'backend_unavailable'},503,origin);
        }
      }
    }
    return response({ok:false,error:'not_found'},404,origin);
  }
  return async request=>{
    try{return await handler(request);}
    catch{return response({ok:false,error:'unavailable'},503,request.headers.get('origin')||'');}
  };
}

const runtime = globalThis.Deno;
if(runtime?.serve){
  runtime.serve(createHandler({
    projectUrl:runtime.env.get('SUPABASE_URL')||'https://renzehysxirjilvdxacv.supabase.co',
    serviceKey:runtime.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',
    anonKey:runtime.env.get('SUPABASE_ANON_KEY')||''
  }));
}
