import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
const checks=[
 ['cardnews-booth.webp','9d54177fc4b67a3a7d9a9b4a8a8fbbe9ab9b0ca23e80e37fb2599d31965f34a1'],
 ['cardnews-program.webp','c826d74fa199e8031ffd6eb2b4c4aa05edd6a559d8587c975869de63d60601e9'],
 ['cardnews-coupon.webp','53049b3d821e230c41df1e710e7af174590f049692d5c61222c2d35f499a9783']
];
test('three 1080x1350 exact-source image cardnews are real immutable raster WebP',()=>{
 for(const [name,sha] of checks){
  const path='festival/2026/assets/'+name,buf=readFileSync(path);
  assert.equal(buf.toString('ascii',0,4),'RIFF',name);
  assert.equal(buf.toString('ascii',8,12),'WEBP',name);
  assert.ok(statSync(path).size>20000,name);
  assert.equal(createHash('sha256').update(buf).digest('hex'),sha,name);
 }
});
test('each application offers original-image cardnews and accessible download action',()=>{
 for(const path of ['festival/2026/apply/index.html','festival/2026/coupon/index.html']){
  const body=readFileSync(path,'utf8');
  for(const [name] of checks){
   assert.ok(body.includes('../assets/'+name),'missing image '+name+' in '+path);
   assert.ok(body.includes('download="'+name+'"'),'missing download '+name);
  }
  assert.ok(body.includes('class="pdf-cardnews"'),'missing cardnews section '+path);
  assert.ok(body.includes('실제 2026 행사 현장 사진은 아니며'),'source context absent');
 }
});
test('existing PDF original and official poster/maps and untouched API remain available',()=>{
 const booth=readFileSync('festival/2026/apply/index.html','utf8');
 const coupon=readFileSync('festival/2026/coupon/index.html','utf8');
 for(const x of [booth,coupon]){
  assert.ok(x.includes('du-dream-2026-official-poster.webp'));
  assert.ok(x.includes('du-dream-2026-traffic-overview.webp'));
  assert.ok(x.includes('du-dream-2026-traffic-detail.webp'));
  assert.ok(x.includes('../assets/poster.webp'));
 }
 assert.match(booth,/submitApi=edge\+'\/apply\/booth'/);
 assert.match(coupon,/submitApi=edge\+'\/apply\/coupon'/);
});

test('all mobile cardnews display at original 4:5 ratio and offer uncropped full-size view',()=>{
 const css=readFileSync('festival/2026/festival-pdf-gallery.css','utf8');
 assert.match(css,/max-width:540px[\s\S]*?\.pdf-cardnews-card img\{width:100%;height:auto;aspect-ratio:4\/5;object-fit:contain\}/);
 for(const p of ['festival/2026/apply/index.html','festival/2026/coupon/index.html']){
  const html=readFileSync(p,'utf8');
  assert.equal((html.match(/class="pdf-cardnews-image-link"/g)||[]).length,3,p);
 }
});
