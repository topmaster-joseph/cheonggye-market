import assert from 'node:assert/strict';
import gateway, { upstreamUrl, canonicalLocation, rewriteHtml, isLivePath, isMarketingPath, isOwnerAdminPath } from './cgma-root-gateway.js';

assert.equal(upstreamUrl('https://ekodi.kr/cgma').toString(), 'https://cheonggye-market.pages.dev/');
assert.equal(upstreamUrl('https://ekodi.kr/cgma/admin?x=1').toString(), 'https://cheonggye-market.pages.dev/admin?x=1');
assert.equal(canonicalLocation('/member/'), 'https://ekodi.kr/cgma/member/');
assert.equal(canonicalLocation('https://example.com/x'), 'https://example.com/x');

const rewritten = rewriteHtml('<html><head></head><body><header class="site-header">H</header><a href="/member">M</a><script src="/app.js"></script><a href="https://example.com">E</a></body></html>');
assert.match(rewritten, /href="\/cgma\/member"/);
assert.match(rewritten, /src="\/cgma\/app\.js"/);
assert.match(rewritten, /href="https:\/\/example\.com"/);
assert.match(rewritten, /rel="canonical" href="https:\/\/ekodi\.kr\/cgma"/);
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

globalThis.fetch = originalFetch;
console.log('CGMA root gateway contract OK');
