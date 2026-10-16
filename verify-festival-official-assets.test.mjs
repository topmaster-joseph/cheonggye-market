import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';

const assets=[
 ['du-dream-2026-official-poster.webp','4cd6eab680f3e8b887e009737661c6f6493fe8347a8c731eb7450d545bd95336'],
 ['du-dream-2026-traffic-overview.webp','07bd92387a4a98119a7e561c58d0e8e7b85387b7276f10e509ecf78375853077'],
 ['du-dream-2026-traffic-detail.webp','39eb2ac7b9a47cbdb9855685c74b62353827e1b146ec7d739bcab59df3ff651b']
];
const root='festival/2026/assets/';
const booth=readFileSync('festival/2026/apply/index.html','utf8');
const coupon=readFileSync('festival/2026/coupon/index.html','utf8');
const home=readFileSync('index.html','utf8');

test('three supplied official image assets are immutable WebP originals of approved conversion',()=>{
 for(const [name,checksum] of assets){
  const path=root+name,buf=readFileSync(path);
  assert.ok(statSync(path).size>20000,'Missing real image bytes: '+path);
  assert.equal(buf.toString('ascii',0,4),'RIFF');
  assert.equal(buf.toString('ascii',8,12),'WEBP');
  assert.equal(createHash('sha256').update(buf).digest('hex'),checksum,'Wrong source image: '+name);
 }
});
test('both public applications render the same 2026 official poster and two route maps',()=>{
 for(const [name] of assets){
  const rel='../assets/'+name;
  assert.ok(booth.includes(rel),'booth missing '+name);
  assert.ok(coupon.includes(rel),'coupon missing '+name);
 }
 for(const page of [booth,coupon]){
  assert.doesNotMatch(page,/images\.unsplash\.com|i\.ytimg\.com/,'Old third party photos must be removed');
  assert.match(page,/target="_blank" rel="noopener"/);
  assert.match(page,/98m/);
  assert.match(page,/loading="lazy"/);
 }
 assert.match(home,/festival\/2026\/assets\/du-dream-2026-official-poster.webp/);
 assert.match(home,/festival\/2026\/apply\/#traffic/);
});
test('business-critical application APIs, required fields and two independent forms are unchanged',()=>{
 assert.match(booth,/apply\/booth/);
 assert.match(booth,/name="membership"/);
 assert.match(booth,/name="privacyConsent"/);
 assert.match(booth,/name="shop"/);
 assert.match(coupon,/apply\/coupon/);
 assert.match(coupon,/name="couponAcceptance"/);
 assert.match(coupon,/name="location"/);
 assert.match(coupon,/name="privacyConsent"/);
});
