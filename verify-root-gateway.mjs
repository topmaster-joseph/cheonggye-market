import assert from 'node:assert/strict';
import gateway, { upstreamUrl, canonicalLocation, rewriteHtml, isMarketingPath } from './cgma-root-gateway.js';

assert.equal(upstreamUrl('https://ekodi.kr/cgma').toString(), 'https://cheonggye-market.pages.dev/');
assert.equal(upstreamUrl('https://ekodi.kr/cgma/admin?x=1').toString(), 'https://cheonggye-market.pages.dev/admin?x=1');
assert.equal(canonicalLocation('/member/'), 'https://ekodi.kr/cgma/member/');
assert.equal(canonicalLocation('https://example.com/x'), 'https://example.com/x');

const rewritten = rewriteHtml('<head></head><a href="/member">M</a><script src="/app.js"></script><a href="https://example.com">E</a>');
assert.match(rewritten, /href="\/cgma\/member"/);
assert.match(rewritten, /src="\/cgma\/app\.js"/);
assert.match(rewritten, /href="https:\/\/example\.com"/);
assert.match(rewritten, /rel="canonical" href="https:\/\/ekodi\.kr\/cgma"/);

assert.equal(isMarketingPath('/cgma/marketing'), true);
assert.equal(isMarketingPath('/cgma/marketing/app.js'), true);
assert.equal(isMarketingPath('/cgma/member'), false);

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

const rootRedirect = await gateway.fetch(new Request('https://ekodi.kr/cgma?x=1'));
assert.equal(rootRedirect.status, 308);
assert.equal(rootRedirect.headers.get('location'), 'https://ekodi.kr/cgma/?x=1');
assert.equal(rootRedirect.headers.get('x-ekodi-route'), 'cgma-root-gateway');

const originalFetch = globalThis.fetch;
let fetchedUrl = '';
globalThis.fetch = async request => {
  fetchedUrl = request.url;
  return new Response('<html><head></head><body><a href="/admin">Admin</a></body></html>', {headers:{'content-type':'text/html'}});
};
const htmlResponse = await gateway.fetch(new Request('https://ekodi.kr/cgma/admin'));
assert.equal(fetchedUrl, 'https://cheonggye-market.pages.dev/admin');
assert.equal(htmlResponse.status, 200);
assert.equal(htmlResponse.headers.get('x-ekodi-route'), 'cgma-root-gateway');
assert.match(await htmlResponse.text(), /href="\/cgma\/admin"/);

globalThis.fetch = async () => new Response(null, {status:308,headers:{location:'/admin/'}});
const redirectResponse = await gateway.fetch(new Request('https://ekodi.kr/cgma/admin'));
assert.equal(redirectResponse.status, 308);
assert.equal(redirectResponse.headers.get('location'), 'https://ekodi.kr/cgma/admin/');

globalThis.fetch = originalFetch;
console.log('CGMA root gateway contract OK');
