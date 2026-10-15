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
 const cors=await fetch(edge+'/apply/coupon',{method:'OPTIONS',headers:{...headers,'access-control-request-method':'POST','access-control-request-headers':'apikey,content-type'},signal:AbortSignal.timeout(15000)});
 const corsOK=cors.status===204&&cors.headers.get('access-control-allow-origin')==='https://cgma.or.kr';
 console.log((corsOK?'PASS ':'FAIL ')+'coupon CORS preflight status='+cors.status);
 if(!corsOK)failed++;
}catch(error){failed++;console.error('FAIL Edge '+error.message)}

console.log('FESTIVAL_PRODUCTION_SMOKE '+(failed?'FAILURES='+failed:'ALL_PASS'));
if(failed)process.exitCode=1;
