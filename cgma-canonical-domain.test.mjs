import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {onRequest,canonicalFor} from './functions/_middleware.js';

// Records what the middleware asks the edge HTMLRewriter to do.
class RecordingRewriter{
  constructor(){this.handlers=[];RecordingRewriter.last=this}
  on(selector,handler){this.handlers.push([selector,handler]);return this}
  transform(response){this.transformed=true;return response}
}
const appended=(rewriter,selector)=>rewriter.handlers.filter(([s])=>s===selector).map(([,h])=>{
  const out=[];h.element({append:(html)=>out.push(html),remove:()=>out.push('REMOVED')});return out.join('');
});
async function run(url,contentType='text/html; charset=utf-8'){
  globalThis.HTMLRewriter=RecordingRewriter;RecordingRewriter.last=null;
  const response=await onRequest({request:new Request(url),next:async()=>new Response('<html><head></head></html>',{headers:{'content-type':contentType}})});
  return {response,rewriter:RecordingRewriter.last};
}

test('canonical path mapping targets cgma.or.kr',()=>{
  assert.equal(canonicalFor('/'),'https://cgma.or.kr/');
  assert.equal(canonicalFor('/index.html'),'https://cgma.or.kr/');
  assert.equal(canonicalFor('/ai-education/index.html'),'https://cgma.or.kr/ai-education/');
  assert.equal(canonicalFor('/notices/12'),'https://cgma.or.kr/notices/12');
});

test('every HTML page served by Pages declares its cgma.or.kr address and drops stale canonicals',async()=>{
  for(const [url,expected] of [
    ['https://cgma.or.kr/','https://cgma.or.kr/'],
    ['https://cheonggye-market.pages.dev/festival/2026/apply/?x=1','https://cgma.or.kr/festival/2026/apply/'],
    ['https://cheonggye-market.pages.dev/notices/7','https://cgma.or.kr/notices/7']
  ]){
    const {rewriter}=await run(url);
    assert.ok(rewriter?.transformed,url);
    assert.deepEqual(appended(rewriter,'link[rel="canonical"]'),['REMOVED'],'existing canonical tags are removed');
    const head=appended(rewriter,'head').join('');
    assert.ok(head.includes(`<link rel="canonical" href="${expected}">`),url);
    assert.equal((head.match(/rel="canonical"/g)||[]).length,1,'exactly one canonical');
  }
});

test('non-HTML responses pass through untouched',async()=>{
  const {rewriter}=await run('https://cgma.or.kr/api/schedule','application/json');
  assert.equal(rewriter,null);
});

test('legacy and www hosts still redirect to cgma.or.kr',async()=>{
  for(const host of ['cgma.ekodi.kr','www.cgma.or.kr']){
    const {response}=await run(`https://${host}/festival/2026/apply/?a=1`);
    assert.equal(response.status,308);
    assert.equal(response.headers.get('location'),'https://cgma.or.kr/festival/2026/apply/?a=1');
  }
});

test('robots.txt and sitemap.xml advertise the representative address',async()=>{
  const [robots,sitemap]=await Promise.all(['robots.txt','sitemap.xml'].map(f=>readFile(new URL('./'+f,import.meta.url),'utf8')));
  assert.match(robots,/^Sitemap: https:\/\/cgma\.or\.kr\/sitemap\.xml$/m);
  assert.match(robots,/^Disallow: \/admin$/m);
  assert.match(robots,/^Disallow: \/api\/$/m);
  const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  assert.ok(locs.length>=1&&locs.every(u=>u.startsWith('https://cgma.or.kr/')));
  assert.ok(locs.includes('https://cgma.or.kr/'));
});
