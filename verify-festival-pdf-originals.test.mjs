import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const text=path=>readFileSync(path,'utf8');
const booth=text('festival/2026/apply/index.html');
const coupon=text('festival/2026/coupon/index.html');
const homepage=text('index.html');
const css=text('festival/2026/festival-plan-theme.css');
const assets=['poster','booth','ramen','tile','dalgona','dalgona-glyphs','acrostic','showcase','program-strip'];
test('all 9 supplied PDF raster assets are stored as actual WebP images',()=>{
 for(const image of assets){
  const path='festival/2026/assets/'+image+'.webp';
  const raw=readFileSync(path);
  assert.equal(raw.toString('ascii',0,4),'RIFF',path);
  assert.equal(raw.toString('ascii',8,12),'WEBP',path);
  assert.ok(raw.length>3000,path);
 }
});
test('homepage and both forms use the user-supplied original festival poster',()=>{
 assert.match(homepage,/festival\/2026\/assets\/poster\.webp/);
 assert.match(booth,/\.\.\/assets\/poster\.webp/);
 assert.match(coupon,/\.\.\/assets\/poster\.webp/);
 assert.match(booth,/festival-plan-theme\.css/);
 assert.match(coupon,/festival-plan-theme\.css/);
 assert.match(css,/--red:#e33c32/);
});
test('festival program faithfully retains PDF planning details',()=>{
 for(const s of ['누구나 라면','모자이크 타일 냄비받침','ㅊㄱㄷㄹ 초성 달고나',
  '청계목대후문자율상권조합','청계공동체 정원모임','청계마실',
  '청계나눔협동조합모임','청계생활환경연구회','오손도손',
  '10~12개','3~5개','2~3개','계획안'])assert.ok(booth.includes(s),s);
 assert.match(booth,/원본 계획안에 상품권 액면 금액은 명시되어 있지 않습니다/);
 assert.match(coupon,/원본 PDF는 5천원 액면가/);
 assert.doesNotMatch(booth,/images\.unsplash\.com|i\.ytimg\.com/);
 assert.doesNotMatch(coupon,/images\.unsplash\.com|i\.ytimg\.com/);
});
test('both actual API submissions and privacy-based consent are preserved',()=>{
 assert.match(booth,/id="application"/);
 assert.match(booth,/name="membership" value="regular" required/);
 assert.match(booth,/name="membership" value="joining" required/);
 assert.match(booth,/최초가입비 5만원, 연회비 6만원/);
 assert.match(booth,/submitApi=edge\+'\/apply\/booth'/);
 assert.match(coupon,/id="couponForm"/);
 assert.match(coupon,/name="couponAcceptance" required/);
 assert.match(coupon,/submitApi=edge\+'\/apply\/coupon'/);
 assert.match(booth,/name="privacyConsent"/);
 assert.match(coupon,/name="privacyConsent"/);
});
test('all images referenced by both pages are checked into the git checkout',()=>{
 for(const page of [booth,coupon]){
  for(const match of page.matchAll(/src="\.\.\/assets\/([a-z-]+\.webp)"/g)){
   assert.ok(statSync('festival/2026/assets/'+match[1]).size>3000,match[1]);
  }
 }
});
