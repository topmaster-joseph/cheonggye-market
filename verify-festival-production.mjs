import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const checks=[
 ['Pages coupon','https://cheonggye-market.pages.dev/festival/2026/coupon/','쿠폰 사용 가능 상가 참여 신청서'],
 ['EKODI coupon','https://ekodi.kr/cgma/festival/2026/coupon/','쿠폰 사용 가능 상가 참여 신청서'],
 ['CGMA coupon','https://cgma.or.kr/festival/2026/coupon/','쿠폰 사용 가능 상가 참여 신청서'],
 ['Pages booth','https://cheonggye-market.pages.dev/festival/2026/apply/','참여부스 온라인 신청'],
 ['EKODI booth','https://ekodi.kr/cgma/festival/2026/apply/','참여부스 온라인 신청'],
 ['CGMA booth','https://cgma.or.kr/festival/2026/apply/','참여부스 온라인 신청']
];
let failed=0;
for(const [label,url,marker] of checks){
 try{
  const response=await fetch(url+'?verify='+Date.now(),{redirect:'follow',signal:AbortSignal.timeout(15000),cache:'no-store'});
  const body=await response.text();
  const ok=response.status===200&&body.includes(marker);
  console.log((ok?'PASS ':'FAIL ')+label+' status='+response.status+' final='+new URL(response.url).pathname+' marker='+body.includes(marker));
  if(!ok)failed++;
 }catch(error){failed++;console.error('FAIL '+label+' '+error.message)}
}
const edge='https://renzehysxirjilvdxacv.supabase.co/functions/v1/cgma-festival-intake';
const headers={origin:'https://cgma.or.kr',apikey:'sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_'};
try{
 const response=await fetch(edge+'/status',{headers,signal:AbortSignal.timeout(15000)});
 const body=await response.json();
 const ok=response.status===200&&body.ok===true&&body.couponValue===5000;
 console.log((ok?'PASS ':'FAIL ')+'Edge status: '+JSON.stringify({status:response.status,boothOpen:body.boothOpen,couponOpen:body.couponOpen,couponValue:body.couponValue}));
 if(!ok)failed++;
 const denied=await fetch(edge+'/admin/coupon',{headers,signal:AbortSignal.timeout(15000)});
 const deniedBody=await denied.json();
 const forbidden=denied.status===403&&deniedBody.error==='tenant_admin_required';
 console.log((forbidden?'PASS ':'FAIL ')+'admin denied without valid session: HTTP '+denied.status);
 if(!forbidden)failed++;
 const invalid=await fetch(edge+'/apply/coupon',{
  method:'POST',headers:{...headers,'content-type':'application/json'},
  body:'{}',signal:AbortSignal.timeout(15000)
 });
 const invalidBody=await invalid.json().catch(()=>({}));
 const validationDenied=invalid.status===400&&invalidBody.error==='required_fields';
 console.log((validationDenied?'PASS ':'FAIL ')+'coupon validation rejects empty form: HTTP '+invalid.status);
 if(!validationDenied)failed++;
 const crossOrigin=await fetch(edge+'/apply/booth',{
  method:'POST',headers:{...headers,origin:'https://untrusted.example','content-type':'application/json'},
  body:'{}',signal:AbortSignal.timeout(15000)
 });
 const originDenied=crossOrigin.status===403;
 console.log((originDenied?'PASS ':'FAIL ')+'booth origin anti-spam guard: HTTP '+crossOrigin.status);
 if(!originDenied)failed++;
 const cors=await fetch(edge+'/apply/coupon',{method:'OPTIONS',headers:{...headers,'access-control-request-method':'POST','access-control-request-headers':'apikey,content-type'},signal:AbortSignal.timeout(15000)});
 const corsOK=cors.status===204&&cors.headers.get('access-control-allow-origin')==='https://cgma.or.kr';
 console.log((corsOK?'PASS ':'FAIL ')+'coupon CORS preflight status='+cors.status);
 if(!corsOK)failed++;
}catch(error){failed++;console.error('FAIL Edge '+error.message)}


if(process.env.CGMA_VERIFY_OFFICIAL_IMAGES==='1'){
 const checks=[
  ['du-dream-2026-official-poster.webp','4cd6eab680f3e8b887e009737661c6f6493fe8347a8c731eb7450d545bd95336'],
  ['du-dream-2026-traffic-overview.webp','07bd92387a4a98119a7e561c58d0e8e7b85387b7276f10e509ecf78375853077'],
  ['du-dream-2026-traffic-detail.webp','39eb2ac7b9a47cbdb9855685c74b62353827e1b146ec7d739bcab59df3ff651b']
 ];
 const origins=['https://cheonggye-market.pages.dev','https://ekodi.kr/cgma','https://cgma.or.kr'];
 for(const origin of origins){
  for(const [name,sha] of checks){
   try{
    const target=origin+'/festival/2026/assets/'+name;
    const response=await fetch(target,{cache:'no-store',redirect:'follow',signal:AbortSignal.timeout(18000)});
    const body=await response.arrayBuffer();
    const digest=createHash('sha256').update(Buffer.from(body)).digest('hex');
    const type=response.headers.get('content-type')||'';
    const ok=response.status===200&&type.includes('image/webp')&&digest===sha;
    console.log((ok?'PASS ':'FAIL ')+'Official image '+origin+' '+name+' http='+response.status+' type='+type+' bytes='+body.byteLength);
    if(!ok)failed++;
   }catch(error){failed++;console.error('FAIL Official image '+origin+' '+name+' '+error.message);}
  }
 }
}


// Source image publication is checked by inspecting bytes, not merely HTTP 200.
// Cloudflare rewrites must never serve the fallback HTML document for .webp.
const sourceImages=['poster','booth','ramen','tile','dalgona','dalgona-glyphs','acrostic','showcase','program-strip','cardnews-booth','cardnews-program','cardnews-coupon'];
const cardnewsSha={
 'cardnews-booth':'9d54177fc4b67a3a7d9a9b4a8a8fbbe9ab9b0ca23e80e37fb2599d31965f34a1',
 'cardnews-program':'c826d74fa199e8031ffd6eb2b4c4aa05edd6a559d8587c975869de63d60601e9',
 'cardnews-coupon':'53049b3d821e230c41df1e710e7af174590f049692d5c61222c2d35f499a9783'
};
const imageChecks=[
 ...['https://cheonggye-market.pages.dev','https://cgma.or.kr','https://ekodi.kr/cgma'].flatMap(origin=>sourceImages.map(name=>[origin,name]))
];
for(const [origin,name] of imageChecks){
 const url=origin+'/festival/2026/assets/'+name+'.webp';
 try{
  const reply=await fetch(url+'?live_asset='+Date.now(),{redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(15000)});
  const bytes=Buffer.from(await reply.arrayBuffer());
  const correct=reply.status===200 && bytes.length>3000 &&
   bytes.subarray(0,4).toString('ascii')==='RIFF' &&
   bytes.subarray(8,12).toString('ascii')==='WEBP' &&
   (!cardnewsSha[name] || createHash('sha256').update(bytes).digest('hex')===cardnewsSha[name]);
  console.log((correct?'PASS ':'FAIL ')+'original PDF WebP '+origin+' '+name+' status='+reply.status+' bytes='+bytes.length);
  if(!correct)failed++;
 }catch(error){failed++;console.error('FAIL original PDF WebP '+origin+' '+name+' '+error.message)}
}

console.log('FESTIVAL_PRODUCTION_SMOKE '+(failed?'FAILURES='+failed:'ALL_PASS'));
if(failed)process.exitCode=1;
