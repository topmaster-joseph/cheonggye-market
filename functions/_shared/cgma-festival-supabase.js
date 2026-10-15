// EKODI's existing production Supabase project is the controlled fallback for
// the CGMA Pages D1 binding that returns no binding on production.
const SUPABASE_EDGE='https://renzehysxirjilvdxacv.supabase.co/functions/v1/cgma-festival-intake';
const PUBLISHABLE_KEY='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
export const apiReply=(body,status=200)=>Response.json(body,{status,headers:{
 'Cache-Control':'private,no-store,max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
}});
const ALLOWED_ORIGINS=new Set(['https://cgma.or.kr','https://www.cgma.or.kr','https://ekodi.kr','https://cheonggye-market.pages.dev']);
export function requestOrigin(request){
  const origin=request.headers.get('origin');
  return origin || new URL(request.url).origin;
}
export function originAllowed(request){return ALLOWED_ORIGINS.has(requestOrigin(request))}
export async function forwardFestival(route,request,{body,auth=false,env={}}={}){
  const origin=requestOrigin(request);
  if(!ALLOWED_ORIGINS.has(origin))return apiReply({ok:false,error:'origin_invalid'},403);
  const headers={'apikey':PUBLISHABLE_KEY,'origin':origin,'accept':'application/json'};
  if(body!==undefined)headers['content-type']='application/json';
  if(auth){
    const authorization=request.headers.get('authorization')||'';
    if(!/^Bearer\\s+\\S+$/i.test(authorization))return apiReply({ok:false,error:'login_required'},401);
    headers['authorization']=authorization;
  }
  try{
    const fetcher=env.FESTIVAL_TEST_FETCH||fetch;
    const upstream=await fetcher(SUPABASE_EDGE+'/'+route,{
      method:body===undefined?'GET':'POST',headers,
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
      signal:AbortSignal.timeout(12000),redirect:'error'
    });
    const data=await upstream.json().catch(()=>null);
    if(!data||typeof data!=='object')return apiReply({ok:false,error:'backend_unavailable'},502);
    return apiReply(data,upstream.status);
  }catch{
    return apiReply({ok:false,error:'backend_unavailable'},503);
  }
}
export async function requestBody(request){
  const contentType=request.headers.get('content-type')||'';
  if(!/^application\\/json(?:;|$)/i.test(contentType))return null;
  if(Number(request.headers.get('content-length')||0)>8192)return null;
  const raw=await request.text();
  if(raw.length>8192)return null;
  try{
    const obj=JSON.parse(raw);
    return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:null;
  }catch{return null}
}
