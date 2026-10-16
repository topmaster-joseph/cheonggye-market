import {createHash} from 'node:crypto';
const names=['du-dream-2026-official-poster.webp','du-dream-2026-traffic-overview.webp','du-dream-2026-traffic-detail.webp'];
for(const origin of ['https://cheonggye-market.pages.dev','https://ekodi.kr/cgma','https://cgma.or.kr']){
 for(const name of names){
  const url=origin+'/festival/2026/assets/'+name+'?assetcheck='+Date.now();
  try{
   const resp=await fetch(url,{redirect:'follow',cache:'no-store',signal:AbortSignal.timeout(12000)});
   const buf=Buffer.from(await resp.arrayBuffer());
   const hash=createHash('sha256').update(buf).digest('hex');
   console.log('ASSET_DIAG '+JSON.stringify({
    origin,name,status:resp.status,finalUrl:resp.url,
    type:resp.headers.get('content-type'),length:buf.length,
    magic:buf.subarray(0,16).toString('hex'),sha256:hash,
    isWebP:buf.subarray(0,4).toString()==='RIFF'&&buf.subarray(8,12).toString()==='WEBP',
    ifHtml:buf.subarray(0,50).toString('utf8').startsWith('<!doctype')
   }));
  }catch(error){console.log('ASSET_DIAG '+JSON.stringify({origin,name,error:error.message}))}
 }
}
