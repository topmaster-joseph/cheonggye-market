// CGMA 2026 두:드림 축제 접수 Edge Function — 순수 핸들러(Deno·Node 테스트 공용).
// v2(운영, 2026-10-16 배포분)의 동작을 그대로 유지하고 v3에서 다음을 추가했다.
//  - GET  public/coupon-merchants : 승인 상가 공개 목록(상호·위치·품목만, 개인정보 없음)
//  - GET  admin/coupon             : 기존 응답 + 심사 이력(history)
//  - GET  admin/coupon.csv         : 관리자 전용 CSV 다운로드
//  - POST admin/action(review)     : 상태 변경과 이력 기록을 원자적 RPC로 처리(처리자 기록)
export const EVENT = 'cgma-du-dream-2026';
export const ORIGINS = new Set(['https://cgma.or.kr','https://www.cgma.or.kr','https://ekodi.kr','https://cheonggye-market.pages.dev']);
const TABLES = {booth:'cgma_festival_2026_booth',coupon:'cgma_festival_2026_coupon_merchant'};
const REVIEW_LABEL = {pending:'검토 대기',approved:'참여 승인',rejected:'미승인'};
const EXPIRES_AT = Date.parse('2027-01-28T00:00:00+09:00');

const baseHeaders = {'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const cors = origin => ORIGINS.has(origin) ? {'access-control-allow-origin':origin,'vary':'Origin'} : {};
export const json = (body,status=200,origin='',extra={}) => new Response(JSON.stringify(body),{
  status,headers:{'content-type':'application/json; charset=utf-8',...baseHeaders,...cors(origin),...extra}});

const clean = (v,max) => typeof v==='string' ? v.trim().slice(0,max+1) : '';
const phoneOf = v => { const p=clean(v,30).replace(/[\s()-]/g,''); return /^0\d{8,10}$/.test(p)?p:null; };
const validUuid = v => typeof v==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export function kst(value){
  if(!value) return '';
  const d = new Date(value); if(Number.isNaN(d.getTime())) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}
export function formatPhone(p){
  const s=String(p||'');
  if(/^01\d{9}$/.test(s)) return s.replace(/^(\d{3})(\d{4})(\d{4})$/,'$1-$2-$3');
  if(/^01\d{8}$/.test(s)) return s.replace(/^(\d{3})(\d{3})(\d{4})$/,'$1-$2-$3');
  if(/^02\d{7,8}$/.test(s)) return s.replace(/^(02)(\d{3,4})(\d{4})$/,'$1-$2-$3');
  if(/^0\d{9,10}$/.test(s)) return s.replace(/^(\d{3})(\d{3,4})(\d{4})$/,'$1-$2-$3');
  return s;
}
// RFC 4180 셀 + 스프레드시트 수식 주입 방지(=,+,-,@,탭,CR로 시작하면 ' 접두)
export function csvCell(value){
  let s = String(value ?? '');
  if(/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}
export function couponCsv(items,history){
  const last = new Map();
  for(const h of history||[]) if(h.event==='review'){
    const prev=last.get(h.receipt);
    if(!prev || Date.parse(h.created_at)>Date.parse(prev.created_at)) last.set(h.receipt,h);
  }
  const rows=[...items].sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
  const header=['번호','접수번호','상호','연락처','상가 주소·위치','주요 취급 품목','심사 상태','쿠폰 사용','신청일시(KST)','최종 처리일시(KST)','최종 처리자'];
  const lines=[header.map(csvCell).join(',')];
  rows.forEach((x,i)=>{
    const h=last.get(x.receipt);
    lines.push([i+1,x.receipt,x.shop_name,formatPhone(x.phone),x.location_text,x.items,
      REVIEW_LABEL[x.review_state]||x.review_state,x.review_state==='approved'?'가능':'미확정',
      kst(x.created_at),h?kst(h.created_at):'',h?.actor_email||''].map(csvCell).join(','));
  });
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function createHandler({projectUrl,serviceKey,anonKey,fetch:fx=fetch,now=()=>Date.now()}){
  async function db(path,method='GET',body=null,prefer='return=representation'){
    if(!serviceKey) throw Error('backend_unavailable');
    const headers={'apikey':serviceKey,'authorization':'Bearer '+serviceKey,'accept':'application/json'};
    if(method!=='GET'){headers['content-type']='application/json';headers['prefer']=prefer;}
    const res=await fx(projectUrl+'/rest/v1/'+path,{method,headers,body:body===null?undefined:JSON.stringify(body)});
    const text=await res.text();
    let data;try{data=text?JSON.parse(text):null}catch{data=null}
    if(!res.ok){
      const err=new Error('database_request_failed');err.status=res.status;err.dbCode=data?.code;
      err.dbMessage=String(data?.message||'').slice(0,120);throw err;
    }
    return data;
  }
  async function setting(){
    const data=await db('cgma_festival_2026_settings?select=booth_open,coupon_open&event_id=eq.'+EVENT+'&limit=1');
    if(!Array.isArray(data)||!data[0]) throw Error('setting_missing');
    return data[0];
  }
  // 기존 CGMA 관리자 권한 계약(membership-api reviewer authority)을 그대로 사용. 이메일 매칭 아님.
  async function administrator(request){
    const authorization=request.headers.get('authorization')||'';
    if(!/^Bearer\s+\S+$/i.test(authorization)||!anonKey) return null;
    const h={Authorization:authorization,apikey:anonKey};
    const user=await fx(projectUrl+'/auth/v1/user',{headers:h}).catch(()=>null);
    if(!user?.ok) return null;
    const profile=await user.json().catch(()=>null);
    const access=await fx(projectUrl+'/functions/v1/membership-api/pending?tenant=cheonggye',{headers:h}).catch(()=>null);
    if(!access?.ok) return null;
    const value=await access.json().catch(()=>null);
    if(!value?.reviewer||!['platform','tenant'].includes(value.reviewer.authority)) return null;
    return {id:validUuid(profile?.id)?profile.id:null,email:typeof profile?.email==='string'?profile.email.slice(0,254):null};
  }
  async function couponAdminData(){
    const cols='receipt,shop_name,phone,location_text,items,review_state,created_at,updated_at';
    const [s,list,history]=await Promise.all([
      setting(),
      db(TABLES.coupon+'?select='+cols+'&event_id=eq.'+EVENT+'&order=created_at.desc&limit=300'),
      db('cgma_festival_2026_coupon_review_log?select=receipt,event,from_state,to_state,actor_email,created_at&order=created_at.desc&limit=1000')
    ]);
    return {s,list:list||[],history:history||[]};
  }

  return async function handler(request){
    const origin=request.headers.get('origin')||'';
    if(request.method==='OPTIONS'){
      if(!ORIGINS.has(origin)) return json({ok:false,error:'origin_invalid'},403,origin);
      return new Response(null,{status:204,headers:{
        'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS',
        'access-control-allow-headers':'authorization,apikey,content-type','access-control-max-age':'600',
        'access-control-expose-headers':'content-disposition','vary':'Origin'}});
    }
    const segments=new URL(request.url).pathname.split('/').filter(Boolean);
    const start=segments.indexOf('cgma-festival-intake');
    const route=segments.slice(start<0?0:start+1).join('/');
    if(!serviceKey) return json({ok:false,error:'backend_unavailable'},503,origin);

    if(request.method==='GET'&&route==='status'){
      try{
        const s=await setting();
        return json({ok:true,boothOpen:s.booth_open,couponOpen:s.coupon_open,capacity:5,couponValue:5000,deadline:null},200,origin);
      }catch{return json({ok:false,error:'backend_unavailable'},503,origin);}
    }

    if(request.method==='GET'&&route==='public/coupon-merchants'){
      try{
        const rows=await db('cgma_festival_2026_coupon_public?select=shop_name,location_text,items&order=shop_name.asc&limit=300');
        const merchants=(rows||[]).map(r=>({shopName:String(r.shop_name),location:String(r.location_text),items:String(r.items)}));
        return json({ok:true,eventId:EVENT,couponValue:5000,count:merchants.length,merchants},200,origin,
          {'cache-control':'public, max-age=60, s-maxage=60'});
      }catch{return json({ok:false,error:'backend_unavailable'},503,origin);}
    }

    if(request.method==='POST'&&route.startsWith('apply/')){
      if(!ORIGINS.has(origin)) return json({ok:false,error:'origin_invalid'},403,origin);
      if(now()>=EXPIRES_AT) return json({ok:false,error:'event_closed'},410,origin);
      const len=Number(request.headers.get('content-length')||0);
      if(len>8192) return json({ok:false,error:'too_large'},413,origin);
      const raw=await request.text();
      if(raw.length>8192) return json({ok:false,error:'too_large'},413,origin);
      let v;try{v=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400,origin);}
      if(!v||typeof v!=='object'||Array.isArray(v)) return json({ok:false,error:'invalid_json'},400,origin);
      if(v.website) return json({ok:false,error:'invalid_submission'},400,origin);
      const kind=route.split('/')[1];
      if(!['booth','coupon'].includes(kind)) return json({ok:false,error:'invalid_kind'},404,origin);
      const shop=clean(v.shop,80),phone=phoneOf(v.phone),items=clean(v.items,500);
      if(!shop||shop.length>80||!phone||!items||items.length>500||v.privacyConsent!==true) return json({ok:false,error:'required_fields'},400,origin);
      const record={event_id:EVENT,shop_name:shop,phone,items,privacy_consented_at:new Date(now()).toISOString()};
      if(kind==='booth'){
        if(!['regular','joining'].includes(v.membership)) return json({ok:false,error:'membership_required'},400,origin);
        record.membership_choice=v.membership;
      }else{
        const location=clean(v.location,200);
        if(!location||location.length>200||v.couponAcceptance!==true) return json({ok:false,error:'required_fields'},400,origin);
        record.location_text=location;record.accepts_coupon_5000=true;
      }
      try{
        const s=await setting();
        if(kind==='booth'&&!s.booth_open||kind==='coupon'&&!s.coupon_open) return json({ok:false,error:'intake_closed'},409,origin);
        const result=await db(TABLES[kind]+'?select=receipt','POST',record);
        if(!Array.isArray(result)||!result[0]?.receipt) throw Error('missing_receipt');
        return json({ok:true,receipt:result[0].receipt,kind,...(kind==='booth'?{membershipApplicationRequired:v.membership==='joining'}:{couponValue:5000})},201,origin);
      }catch(error){
        if(error.dbCode==='23505') return json({ok:false,error:'duplicate_application'},409,origin);
        if(error.dbMessage?.includes('festival_intake_closed')) return json({ok:false,error:'intake_closed'},409,origin);
        return json({ok:false,error:'backend_unavailable'},503,origin);
      }
    }

    if(route.startsWith('admin/')){
      const admin=await administrator(request);
      if(!admin) return json({ok:false,error:'tenant_admin_required'},403,origin);

      if(request.method==='GET'&&route==='admin/coupon.csv'){
        try{
          const {list,history}=await couponAdminData();
          const day=kst(new Date(now()).toISOString()).slice(0,10).replace(/-/g,'');
          return new Response(couponCsv(list,history),{status:200,headers:{
            'content-type':'text/csv; charset=utf-8',
            'content-disposition':`attachment; filename="cgma-coupon-merchants-${day}.csv"`,
            ...baseHeaders,...cors(origin),'access-control-expose-headers':'content-disposition'}});
        }catch{return json({ok:false,error:'backend_unavailable'},503,origin);}
      }

      if(request.method==='GET'&&route==='admin/coupon'){
        try{
          const {s,list,history}=await couponAdminData();
          return json({ok:true,open:s.coupon_open,capacity:null,items:list,history},200,origin);
        }catch{return json({ok:false,error:'backend_unavailable'},503,origin);}
      }

      if(request.method==='GET'&&route==='admin/booth'){
        const cols='receipt,shop_name,phone,items,membership_choice,membership_verified,other_support_selected,selection_state,selected_slot,created_at';
        try{
          const [s,list]=await Promise.all([setting(),db(TABLES.booth+'?select='+cols+'&event_id=eq.'+EVENT+'&order=created_at.desc&limit=300')]);
          return json({ok:true,open:s.booth_open,capacity:5,items:list||[]},200,origin);
        }catch{return json({ok:false,error:'backend_unavailable'},503,origin);}
      }

      if(request.method==='POST'&&route==='admin/action'){
        if(!ORIGINS.has(origin)) return json({ok:false,error:'origin_invalid'},403,origin);
        let v;try{v=await request.json()}catch{return json({ok:false,error:'invalid_json'},400,origin);}
        if(v?.action==='set_intake'&&['booth','coupon'].includes(v.kind)&&typeof v.open==='boolean'){
          const field=v.kind==='booth'?'booth_open':'coupon_open';
          try{
            await db('cgma_festival_2026_settings?event_id=eq.'+EVENT,'PATCH',{[field]:v.open,updated_at:new Date(now()).toISOString()},'return=minimal');
            return json({ok:true,open:v.open},200,origin);
          }catch{return json({ok:false,error:'backend_unavailable'},503,origin);}
        }
        if(!validUuid(v?.receipt)||!['booth','coupon'].includes(v?.kind)) return json({ok:false,error:'invalid_request'},400,origin);
        try{
          if(v.kind==='booth'&&['verify_member','other_support','select'].includes(v.action)){
            if(v.action==='select'&&!['pending','selected','waitlist','rejected'].includes(v.state)) return json({ok:false,error:'invalid_state'},400,origin);
            if(v.action!=='select'&&typeof v.value!=='boolean') return json({ok:false,error:'invalid_value'},400,origin);
            await db('rpc/cgma_festival_2026_admin_update_booth','POST',{p_receipt:v.receipt,p_action:v.action,p_value:String(v.action==='select'?v.state:v.value)});
            return json({ok:true},200,origin);
          }
          if(v.kind==='coupon'&&v.action==='review'&&['pending','approved','rejected'].includes(v.state)){
            const result=await db('rpc/cgma_festival_2026_coupon_review','POST',{p_receipt:v.receipt,p_state:v.state,p_actor_id:admin.id,p_actor_email:admin.email});
            return json({ok:true,changed:result?.changed===true},200,origin);
          }
          return json({ok:false,error:'invalid_action'},400,origin);
        }catch(error){
          if(error.dbMessage?.includes('not_found')) return json({ok:false,error:'not_found'},404,origin);
          if(error.dbMessage?.includes('selection_limit')) return json({ok:false,error:'selection_limit'},409,origin);
          if(error.dbMessage?.includes('membership_not_verified')) return json({ok:false,error:'membership_not_verified'},409,origin);
          return json({ok:false,error:'backend_unavailable'},503,origin);
        }
      }
    }
    return json({ok:false,error:'not_found'},404,origin);
  };
}
