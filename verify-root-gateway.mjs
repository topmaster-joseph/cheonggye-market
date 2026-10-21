import assert from 'node:assert/strict';
import gateway, { upstreamUrl, canonicalLocation, rewriteHtml, publicCanonical, isAiEducationPath, isBoardPath, isLivePath, isMarketingPath, isOwnerAdminPath } from './cgma-root-gateway.js';

assert.equal(upstreamUrl('https://ekodi.kr/cgma').toString(), 'https://cheonggye-market.pages.dev/');
assert.equal(upstreamUrl('https://ekodi.kr/cgma/admin?x=1').toString(), 'https://cheonggye-market.pages.dev/admin?x=1');
assert.equal(canonicalLocation('/member/'), 'https://ekodi.kr/cgma/member/');
assert.equal(canonicalLocation('https://example.com/x'), 'https://example.com/x');

const rewritten = rewriteHtml('<html><head></head><body><header class="site-header">H</header><a href="/member">M</a><script src="/app.js"></script><a href="https://example.com">E</a></body></html>');
assert.match(rewritten, /href="\/cgma\/member"/);
assert.match(rewritten, /src="\/cgma\/app\.js"/);
assert.match(rewritten, /href="https:\/\/example\.com"/);
assert.match(rewritten, /rel="canonical" href="https:\/\/cgma\.or\.kr\/"/);
// Representative address is cgma.or.kr (owner decision 2026-10-20); canonical follows the page path.
assert.equal(publicCanonical('/'), 'https://cgma.or.kr/');
assert.equal(publicCanonical('/index.html'), 'https://cgma.or.kr/');
assert.equal(publicCanonical('/festival/2026/apply/'), 'https://cgma.or.kr/festival/2026/apply/');
assert.equal(publicCanonical('/ai-education/index.html'), 'https://cgma.or.kr/ai-education/');
const sub = rewriteHtml('<html><head><link rel="canonical" href="https://ekodi.kr/cgma"></head><body></body></html>', '/notices/7');
assert.match(sub, /<link rel="canonical" href="https:\/\/cgma\.or\.kr\/notices\/7">/);
assert.equal((sub.match(/rel="canonical"/g) || []).length, 1);
assert.match(rewritten, /data-ekodi-tenant-readability="v1"/);
assert.match(rewritten, /data-ekodi-tenant-readability-style="v1"/);
assert.match(rewritten, /https:\/\/ekodi\.kr\/shell\/user-ui-shell\.css\?tenant-readability=v1/);
assert.match(rewritten, /data-ekodi-tenant-mobile-header="v1"/);
assert.match(rewritten, /https:\/\/ekodi\.kr\/shell\/mobile-fixed-header\.js\?tenant-readability=v1/);
assert.match(rewritten, /data-ekodi-fixed-header="v1"/);

assert.equal(isLivePath('/cgma/live'), true);
assert.equal(isLivePath('/cgma/live/'), true);
assert.equal(isLivePath('/cgma/live/index.html'), true);
assert.equal(isLivePath('/cgma/live/assets'), false);

assert.equal(isBoardPath('/cgma/board'), true);
assert.equal(isBoardPath('/cgma/board/'), true);
assert.equal(isBoardPath('/cgma/board/api/health'), true);
assert.equal(isBoardPath('/cgma/boards'), false);

// AI education is scoped to CGMA Pages assets and explicit API paths.
for(const url of ['/cgma/ai-education','/cgma/ai-education/','/cgma/ai-education/app.js',
  '/cgma/ai-education/questions.mjs','/cgma/ai-education/report/','/cgma/ai-education/api/responses'])
  assert.equal(isAiEducationPath(url),true);
assert.equal(isAiEducationPath('/cgma/ai-education-other'),false);
assert.equal(isAiEducationPath('/cgma/admin'),false);
const originalSurveyFetch=globalThis.fetch;
let surveyUpstream='',surveyCalls=[],forwardedCookie='',forwardedAuth='';
globalThis.fetch=async request=>{
  const url=new URL(request.url);
  surveyUpstream=request.url;
  surveyCalls.push({path:url.pathname,method:request.method});
  forwardedAuth=request.headers.get('authorization');
  forwardedCookie=request.headers.get('cookie');
  if(url.pathname==='/ai-education/'){
    return new Response('<title>상인 AI 교육 수요조사</title><form id="survey"></form><script src="./app.js"></script>',{headers:{'content-type':'text/html'}});
  }
  if(url.pathname==='/ai-education/app.js'){
    return new Response("const questions = []; document.getElementById('survey')",{headers:{'content-type':'application/javascript'}});
  }
  if(url.pathname==='/ai-education/questions.mjs'){
    return new Response('export const SURVEY_QUESTIONS = []; // 교육 희망 기기 교육 희망 장소',{headers:{'content-type':'text/javascript'}});
  }
  if(url.pathname==='/ai-education/report/'){
    return new Response('<title>AI 교육 수요조사 통계</title><div id="charts"></div><script src="./app.js"></script>',{headers:{'content-type':'text/html'}});
  }
  if(url.pathname==='/ai-education/report/app.js'){
    return new Response("document.getElementById('charts'); const z=stats.sections;",{headers:{'content-type':'application/javascript'}});
  }
  if(url.pathname.startsWith('/api/ai-education-')){
    return Response.json({ok:true,saved:true,total:4},{status:request.method==='POST'?201:200});
  }
  return new Response('<title>청계면상인회 홈페이지</title>',{headers:{'content-type':'text/html'}});
};
const surveyResponse=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/?source=cgma'),{});
assert.equal(surveyUpstream,'https://cheonggye-market.pages.dev/ai-education/?source=cgma');
assert.equal(surveyResponse.status,200);
assert.equal(surveyResponse.headers.get('x-ekodi-route'),'cgma-ai-education-survey');
assert.match(surveyResponse.headers.get('content-security-policy'),/connect-src 'self'/);
// The admin statistics drawer embeds the same-origin admin workbench and its stylesheet.
assert.match(surveyResponse.headers.get('content-security-policy'),/frame-src 'self'/);
assert.match(surveyResponse.headers.get('content-security-policy'),/style-src 'self'/);
assert.match(surveyResponse.headers.get('content-security-policy'),/frame-ancestors 'none'/);
assert.doesNotMatch(surveyResponse.headers.get('content-security-policy'),/frame-src[^;]*(\*|https:)/);
assert.match(await surveyResponse.text(),/수요조사/);
const surveyScript=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/app.js'));
assert.equal(surveyScript.status,200);
assert.match(surveyScript.headers.get('content-type'),/javascript/);
const schemaScript=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/questions.mjs'));
assert.equal(schemaScript.status,200);
assert.match(await schemaScript.text(),/교육 희망 장소/);
const sharedReport=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/report/'));
assert.equal(sharedReport.status,200);
assert.match(await sharedReport.text(),/통계/);
const reportJs=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/report/app.js'));
assert.equal(reportJs.status,200);
const redirect=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education?ref=1'));
assert.equal(redirect.status,308);
assert.equal(redirect.headers.get('location'),'https://ekodi.kr/cgma/ai-education/?ref=1');
const reportRedirect=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/report?token=abc'));
assert.equal(reportRedirect.status,308);
assert.equal(reportRedirect.headers.get('location'),'https://ekodi.kr/cgma/ai-education/report/?token=abc');
const surveyApiRequest=new Request('https://ekodi.kr/cgma/ai-education/api/responses',{
  method:'POST',headers:{'content-type':'application/json','origin':'https://ekodi.kr','cookie':'private_session=do-not-forward'},
  body:'{"answers":{}}'
});
const surveyApiResponse=await gateway.fetch(surveyApiRequest);
assert.equal(surveyApiResponse.status,201);
assert.equal(surveyApiResponse.headers.get('x-ekodi-route'),'cgma-ai-education-api');
assert.equal(surveyApiResponse.headers.get('cache-control'),'private, no-store, max-age=0');
assert.equal(surveyUpstream,'https://cheonggye-market.pages.dev/api/ai-education-responses');
assert.equal(forwardedCookie,null);
const privateStats=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/api/stats',{headers:{authorization:'Bearer sample-test-value'}}));
assert.equal(privateStats.status,200);
assert.equal(forwardedAuth,'Bearer sample-test-value');
assert.equal(surveyUpstream,'https://cheonggye-market.pages.dev/api/ai-education-stats');
const sharedApi=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/api/share?token=sample'));
assert.equal(sharedApi.status,200);
assert.equal(surveyUpstream,'https://cheonggye-market.pages.dev/api/ai-education-share?token=sample');
const surveyInvalid=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/unknown'));
assert.equal(surveyInvalid.status,404);
const surveyWrite=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/',{method:'POST',body:'{}'}));
assert.equal(surveyWrite.status,405);
const surveyStatsWrite=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/api/stats',{method:'POST',body:'{}'}));
assert.equal(surveyStatsWrite.status,405);
globalThis.fetch=async()=>new Response('<title>청계면상인회</title>',{headers:{'content-type':'text/html'}});
const surveyWrongContent=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/'));
assert.equal(surveyWrongContent.status,503);
const surveyWrongApi=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/api/stats'));
assert.equal(surveyWrongApi.status,502);
globalThis.fetch=async()=>{throw Error('upstream unavailable')};
const surveyException=await gateway.fetch(new Request('https://ekodi.kr/cgma/ai-education/'));
assert.equal(surveyException.status,502);
globalThis.fetch=originalSurveyFetch;

let boardRequest='';
const boardResponse=await gateway.fetch(new Request('https://ekodi.kr/cgma/board/api/health?probe=1'),{EKODI_BOARD:{fetch:async request=>{boardRequest=request.url;return new Response('{"ok":true}',{status:200,headers:{'content-type':'application/json','x-ekodi-board-independent':'true','x-ekodi-board-id':'site:cgma:main'}});}}});
assert.equal(boardRequest,'https://board.internal.ekodi/cgma/board/api/health?probe=1');
assert.equal(boardResponse.status,200);
assert.equal(boardResponse.headers.get('x-ekodi-board-independent'),'true');
assert.equal(boardResponse.headers.get('x-ekodi-board-id'),'site:cgma:main');
let forwardedBoardHost='';
await gateway.fetch(new Request('https://ekodi.kr/cgma/board'),{EKODI_BOARD:{fetch:async request=>{
  forwardedBoardHost=request.headers.get('x-ekodi-forwarded-host')||'';
  return new Response('BOARD',{status:200,headers:{'x-ekodi-board-independent':'true','x-ekodi-board-id':'site:cgma:main'}});
}}});
assert.equal(forwardedBoardHost,'ekodi.kr');
const boardFailClosed=await gateway.fetch(new Request('https://ekodi.kr/cgma/board'),{EKODI_BOARD:{fetch:async()=>new Response('WRONG',{status:200,headers:{'x-ekodi-route':'cgma-root-gateway'}})}});
assert.equal(boardFailClosed.status,502);
assert.match(boardFailClosed.headers.get('x-ekodi-cgma-board-diagnostic')||'',/internal:upstream-200:id-missing/);
assert.equal(boardFailClosed.headers.get('cache-control'),'no-store');
assert.doesNotMatch(boardFailClosed.headers.get('x-ekodi-cgma-board-diagnostic')||'',/Authorization|Bearer|board\.internal\.ekodi/);
const boardUnavailable=await gateway.fetch(new Request('https://ekodi.kr/cgma/board'),{});
assert.equal(boardUnavailable.status,503);
const boardFallbackCalls=[];
const boardFallback=await gateway.fetch(new Request('https://ekodi.kr/cgma/board/api/posts'),{EKODI_BOARD:{fetch:async request=>{
  boardFallbackCalls.push(request.url);
  if(request.url.endsWith('/cgma/board/api/health')) return new Response('{"ok":true,"boardId":"site:cgma:main","siteId":"cgma","independent":true}',{status:200,headers:{'content-type':'application/json'}});
  return new Response('{"items":[]}',{status:200,headers:{'content-type':'application/json'}});
}}});
assert.equal(boardFallback.status,200);
assert.equal(boardFallback.headers.get('x-ekodi-board-independent'),'true');
assert.equal(boardFallback.headers.get('x-ekodi-board-id'),'site:cgma:main');
assert.deepEqual(boardFallbackCalls,[
  'https://board.internal.ekodi/cgma/board/api/posts',
  'https://board.internal.ekodi/cgma/board/api/health'
]);
assert.equal(await boardFallback.text(),'{"items":[]}');

// Read-only recovery uses a second host INSIDE the same Service Binding, never the public network.
const hostRecoveryCalls=[];
const hostRecovery=await gateway.fetch(new Request('https://ekodi.kr/cgma/board'), {EKODI_BOARD:{fetch:async request=>{
  hostRecoveryCalls.push(request.url);
  if(request.url.startsWith('https://board.internal.ekodi/'))return new Response('upstream unavailable',{status:502});
  return new Response('<title>게시판</title>',{status:200,headers:{'x-ekodi-board-independent':'true','x-ekodi-board-id':'site:cgma:main'}});
}}});
assert.equal(hostRecovery.status,200);
assert.deepEqual(hostRecoveryCalls,[
  'https://board.internal.ekodi/cgma/board',
  'https://board.internal.ekodi/cgma/board/api/health',
  'https://ekodi.kr/cgma/board',
]);
// Mutating requests must NOT be replayed to another service host.
const mutationCalls=[];
const blockedMutation=await gateway.fetch(new Request('https://ekodi.kr/cgma/board/api/posts',{method:'POST',body:'{}'}),{EKODI_BOARD:{fetch:async request=>{
  mutationCalls.push(request.url);
  return new Response('upstream unavailable',{status:502});
}}});
assert.equal(blockedMutation.status,502);
assert.ok(mutationCalls.every(url=>url.startsWith('https://board.internal.ekodi/')));
assert.equal(mutationCalls.filter(url=>url.endsWith('/api/posts')).length,1);
let liveRequest='';
const liveResponse=await gateway.fetch(new Request('https://ekodi.kr/cgma/live/?room=test'),{EKODI_SHARED:{fetch:async request=>{liveRequest=request.url;return new Response('<body data-tenant="cgma">LIVE</body>',{status:200,headers:{'content-type':'text/html'}});}}});
assert.equal(liveRequest,'https://ekodi.kr/cgma/live/?room=test');
assert.equal(liveResponse.status,200);
assert.match(await liveResponse.text(),/data-tenant="cgma"/);
const liveUnavailable=await gateway.fetch(new Request('https://ekodi.kr/cgma/live/'),{});
assert.equal(liveUnavailable.status,503);

assert.equal(isMarketingPath('/cgma/marketing'), true);
assert.equal(isMarketingPath('/cgma/marketing/app.js'), true);
assert.equal(isMarketingPath('/cgma/member'), false);
assert.equal(isOwnerAdminPath('/cgma/admin/member'), true);
assert.equal(isOwnerAdminPath('/cgma/admin/member/'), true);
assert.equal(isOwnerAdminPath('/cgma/admin/assets/cgma-member-admin.js'), true);
assert.equal(isOwnerAdminPath('/cgma/admin/publishing'), true);
assert.equal(isOwnerAdminPath('/cgma/admin/marketing'), true);
assert.equal(isOwnerAdminPath('/cgma/admin'), false);
assert.equal(isOwnerAdminPath('/cgma/admin/'), false);

let delegatedOverride='';
const delegatedResponse = await gateway.fetch(new Request('https://ekodi.kr/cgma/marketing', {
  headers:{'Cloudflare-Workers-Version-Overrides':'shy-thunder-39a4="candidate-version"'}
}), {EKODI_SHARED:{fetch:async request=>{
  delegatedOverride=request.headers.get('Cloudflare-Workers-Version-Overrides')||'';
  return new Response('PAUSED',{status:200,headers:{'x-ekodi-route':'marketing-canonical-projection'}});
}}});
assert.equal(delegatedResponse.status, 200);
assert.equal(delegatedResponse.headers.get('x-ekodi-route'), 'marketing-canonical-projection');
assert.equal(await delegatedResponse.text(), 'PAUSED');
assert.equal(delegatedOverride, 'shy-thunder-39a4="candidate-version"');

let ownerRequest='';
const ownerResponse=await gateway.fetch(new Request('https://ekodi.kr/cgma/admin/member'),{EKODI_SHARED:{fetch:async request=>{ownerRequest=request.url;return new Response('OWNER',{status:200,headers:{'x-ekodi-route':'workspace-admin'}});}}});
assert.equal(ownerRequest,'https://ekodi.kr/cgma/admin/member');
assert.equal(ownerResponse.status,200);
assert.equal(ownerResponse.headers.get('x-ekodi-route'),'workspace-admin');
let publishingRequest='';
const publishingResponse=await gateway.fetch(new Request('https://ekodi.kr/cgma/admin/publishing?tab=channels'),{EKODI_SHARED:{fetch:async request=>{publishingRequest=request.url;return new Response('PUBLISHING',{status:200,headers:{'x-ekodi-route':'workspace-admin'}});}}});
assert.equal(publishingRequest,'https://ekodi.kr/cgma/admin/publishing?tab=channels');
assert.equal(publishingResponse.status,200);
assert.equal(publishingResponse.headers.get('x-ekodi-route'),'workspace-admin');
const ownerAsset=await gateway.fetch(new Request('https://ekodi.kr/cgma/admin/assets/cgma-member-admin.js'),{EKODI_SHARED:{fetch:async()=>new Response('ASSET',{status:200,headers:{'x-ekodi-route':'admin-workspace-asset'}})}});
assert.equal(ownerAsset.status,200);
assert.equal(ownerAsset.headers.get('x-ekodi-route'),'admin-workspace-asset');
const ownerFailClosed=await gateway.fetch(new Request('https://ekodi.kr/cgma/admin/member'),{EKODI_SHARED:{fetch:async()=>new Response('WRONG',{status:200,headers:{'x-ekodi-route':'cgma-root-gateway'}})}});
assert.equal(ownerFailClosed.status,502);

const rootRedirect = await gateway.fetch(new Request('https://ekodi.kr/cgma?x=1'));
assert.equal(rootRedirect.status, 308);
assert.equal(rootRedirect.headers.get('location'), 'https://ekodi.kr/cgma/?x=1');
assert.equal(rootRedirect.headers.get('x-ekodi-route'), 'cgma-root-gateway');

const memberAdminRedirect = await gateway.fetch(new Request('https://ekodi.kr/cgma/member-admin?legacy=1'));
assert.equal(memberAdminRedirect.status, 308);
assert.equal(memberAdminRedirect.headers.get('location'), 'https://ekodi.kr/cgma/admin/member?legacy=1');
assert.equal(memberAdminRedirect.headers.get('x-ekodi-route'), 'cgma-root-gateway');

const originalFetch = globalThis.fetch;
let fetchedUrl = '';
globalThis.fetch = async request => {
  fetchedUrl = request.url;
  return new Response('<html><head></head><body><header>CGMA</header><a href="/admin">Admin</a></body></html>', {headers:{'content-type':'text/html','content-security-policy':"default-src 'self'; style-src 'self'; script-src 'self'"}});
};
const htmlResponse = await gateway.fetch(new Request('https://ekodi.kr/cgma/admin'));
assert.equal(fetchedUrl, 'https://cheonggye-market.pages.dev/admin');
assert.equal(htmlResponse.status, 200);
assert.equal(htmlResponse.headers.get('x-ekodi-route'), 'cgma-root-gateway');
assert.equal(htmlResponse.headers.get('x-ekodi-tenant-readability'), 'v1');
assert.match(htmlResponse.headers.get('content-security-policy') || '', /style-src[^;]*https:\/\/ekodi\.kr/);
assert.match(htmlResponse.headers.get('content-security-policy') || '', /script-src[^;]*https:\/\/ekodi\.kr/);
const htmlBody = await htmlResponse.text();
assert.match(htmlBody, /href="\/cgma\/admin"/);
assert.match(htmlBody, /data-ekodi-tenant-readability="v1"/);
assert.match(htmlBody, /data-ekodi-fixed-header="v1"/);

globalThis.fetch = async () => new Response(null, {status:308,headers:{location:'/admin/'}});
const redirectResponse = await gateway.fetch(new Request('https://ekodi.kr/cgma/admin'));
assert.equal(redirectResponse.status, 308);
assert.equal(redirectResponse.headers.get('location'), 'https://ekodi.kr/cgma/admin/');

let forwardedFestivalUrl='',forwardedFestivalBody='',forwardedFestivalOrigin='';
globalThis.fetch = async request => {
  forwardedFestivalUrl=request.url;
  forwardedFestivalBody=await request.text();
  forwardedFestivalOrigin=request.headers.get('origin');
  return Response.json({ok:true,receipt:'test-only'});
};
const festivalPost=await gateway.fetch(new Request('https://ekodi.kr/cgma/api/festival-booths',{
  method:'POST',headers:{origin:'https://ekodi.kr','content-type':'application/json'},
  body:JSON.stringify({shop:'test'})
}));
assert.equal(festivalPost.status,200);
assert.equal(forwardedFestivalUrl,'https://cheonggye-market.pages.dev/api/festival-booths');
assert.equal(forwardedFestivalOrigin,'https://ekodi.kr');
assert.equal(forwardedFestivalBody,'{"shop":"test"}');
globalThis.fetch = originalFetch;
console.log('CGMA root gateway contract OK');

// Board-only binding must not accidentally replace live, admin, or marketing.
assert.match(await (await import('node:fs/promises')).readFile(new URL('./cgma-root-gateway.js',import.meta.url),'utf8'),/async function delegatedBoardResponse[\s\S]*?env\.EKODI_BOARD\.fetch/);

// 2026 motor festival intake: delegated to EKODI_SHARED, exact route header only, never the Pages SPA.
{
  const { isMotorFestivalPath } = await import('./cgma-root-gateway.js');
  for (const p of ['/cgma/motor-festival-2026','/cgma/motor-festival-2026/','/cgma/motor-festival-2026/app.js','/cgma/motor-festival-2026/admin/','/cgma/motor-festival-2026/admin/app.js']) assert.equal(isMotorFestivalPath(p), true, p);
  for (const p of ['/cgma/motor-festival-2026x','/cgma/motor-festival','/cgma/festival/2026/apply/','/cgma/admin']) assert.equal(isMotorFestivalPath(p), false, p);
  let pagesCalls = 0; const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => { pagesCalls++; return new Response('<html>Pages SPA</html>', { status: 200, headers: { 'content-type': 'text/html' } }); };
  try {
    let delegated = '';
    const ok = await gateway.fetch(new Request('https://ekodi.kr/cgma/motor-festival-2026/'), { EKODI_SHARED: { fetch: async r => { delegated = r.url; return new Response('<form id="apply">', { status: 200, headers: { 'content-type': 'text/html', 'x-ekodi-route': 'cgma-motor-festival-2026' } }); } } });
    assert.equal(ok.status, 200);
    assert.equal(delegated, 'https://ekodi.kr/cgma/motor-festival-2026/');
    assert.match(await ok.text(), /id="apply"/);
    const wrongRoute = await gateway.fetch(new Request('https://ekodi.kr/cgma/motor-festival-2026/'), { EKODI_SHARED: { fetch: async () => new Response('admin shell', { status: 200, headers: { 'x-ekodi-route': 'workspace-admin' } }) } });
    assert.equal(wrongRoute.status, 502);
    const unbound = await gateway.fetch(new Request('https://ekodi.kr/cgma/motor-festival-2026/'), {});
    assert.equal(unbound.status, 503);
    const thrown = await gateway.fetch(new Request('https://ekodi.kr/cgma/motor-festival-2026/app.js'), { EKODI_SHARED: { fetch: async () => { throw new Error('down'); } } });
    assert.equal(thrown.status, 502);
    assert.equal(pagesCalls, 0, 'festival path must never reach the Pages upstream');
  } finally { globalThis.fetch = savedFetch; }
  console.log('CGMA motor festival delegation OK');
}
