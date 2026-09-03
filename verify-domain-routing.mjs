import assert from 'node:assert/strict';
import { onRequest } from './functions/_middleware.js';

async function invoke(url) {
  let nextCalled = false;
  const response = await onRequest({ request: new Request(url), next: async () => { nextCalled = true; return new Response('NEXT'); } });
  return { response, nextCalled };
}

let result = await invoke('https://cgma.ekodi.kr/member?apply=1');
assert.equal(result.response.status, 308);
assert.equal(result.response.headers.get('location'), 'https://ekodi.kr/cgma/member?apply=1');
result = await invoke('https://www.cgma.or.kr/admin?view=1');
assert.equal(result.response.status, 308);
assert.equal(result.response.headers.get('location'), 'https://cgma.or.kr/admin?view=1');
result = await invoke('https://cgma.or.kr/');
assert.equal(result.nextCalled, true);
result = await invoke('https://cheonggye-market.pages.dev/');
assert.equal(result.nextCalled, true);
result = await invoke('https://cgma.ai.ekodi.kr/');
assert.equal(result.response.status, 302);
assert.equal(result.response.headers.get('location'), 'https://cgma.ai.ekodi.kr/market-ai');
console.log('CGMA host routing contract OK');
