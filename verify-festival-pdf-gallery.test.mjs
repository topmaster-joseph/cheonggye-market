import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const load=p=>readFileSync(p,'utf8');
const booth=load('festival/2026/apply/index.html');
const coupon=load('festival/2026/coupon/index.html');
const home=load('index.html');
const style=load('festival/2026/festival-pdf-gallery.css');
const images=['poster','booth','ramen','tile','dalgona','dalgona-glyphs','acrostic','showcase','program-strip'];
test('original 7-page PDF supplied images checked in without fake screenshots',()=>{
 for(const name of images){
  const path='festival/2026/assets/'+name+'.webp',bytes=readFileSync(path);
  assert.equal(bytes.toString('ascii',0,4),'RIFF',path);
  assert.equal(bytes.toString('ascii',8,12),'WEBP',path);
  assert.ok(statSync(path).size>3000,path);
 }
});
test('all three newer official supplied images and road maps remain on both forms',()=>{
 const trio=['du-dream-2026-official-poster.webp','du-dream-2026-traffic-overview.webp','du-dream-2026-traffic-detail.webp'];
 for(const name of trio){assert.ok(booth.includes('../assets/'+name),name);assert.ok(coupon.includes('../assets/'+name),name);}
 assert.ok(home.includes('festival/2026/assets/du-dream-2026-official-poster.webp'));
 assert.match(booth,/98m/);assert.match(coupon,/98m/);
});
test('PDF original program images and community groups appear on booth application',()=>{
 for(const s of ['../assets/poster.webp','../assets/ramen.webp','../assets/tile.webp','../assets/dalgona.webp','../assets/acrostic.webp','../assets/showcase.webp','../assets/booth.webp','../assets/program-strip.webp',
  '누구나 라면','모자이크 타일 냄비받침','ㅊㄱㄷㄹ 초성 달고나','청계목대후문자율상권조합',
  '청계공동체 정원모임','청계마실','청계나눔협동조합모임','청계생활환경연구회','오손도손',
  '2~3개','3~5개','10~12개'])assert.ok(booth.includes(s),s);
 assert.ok(style.includes('.pdf-plan'));
 assert.ok(booth.includes('../festival-pdf-gallery.css'));
});
test('coupon page distinguishes user-set 5000 won coupon from unspecified PDF voucher denomination',()=>{
 for(const s of ['../assets/poster.webp','../assets/booth.webp','../assets/ramen.webp','../assets/program-strip.webp','5천원 쿠폰','원본 PDF는 5천원 액면가'])assert.ok(coupon.includes(s),s);
 assert.ok(coupon.includes('../festival-pdf-gallery.css'));
});
test('existing consent, radio selection, server submit and administrator services unchanged',()=>{
 for(const s of ['id="application"','name="membership" value="regular" required','name="membership" value="joining" required','name="privacyConsent"','submitApi=edge+\'/apply/booth\''])assert.ok(booth.includes(s),s);
 for(const s of ['id="couponForm"','name="couponAcceptance"','name="privacyConsent"','submitApi=edge+\'/apply/coupon\''])assert.ok(coupon.includes(s),s);
 assert.doesNotMatch(booth,/images\.unsplash\.com|i\.ytimg\.com/);
 assert.doesNotMatch(coupon,/images\.unsplash\.com|i\.ytimg\.com/);
});

test('remaining original PDF 1-2 and 5-page timetable items are explicitly marked as proposals',()=>{
 for(const exact of ['../assets/dalgona-glyphs.webp','ㅊ·ㄱ·ㄷ·ㄹ','사회자 운영 · 이벤트 진행',
 '주민 농수산물 등 판매부스','학생회 보물찾기','15:00~18:00','교내 별도 진행 예정',
 '점심시간 12:00~13:00','원본 PDF 1~2쪽'])assert.ok(booth.includes(exact),exact);
 assert.match(booth,/11:00~17:00과 종료 시각이 다릅니다/);
});
