import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const home=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const catalog=readFileSync(new URL('./resources.js',import.meta.url),'utf8');
const page=readFileSync(new URL('./mascot/index.html',import.meta.url),'utf8');
const pagesAsset=readFileSync(new URL('./cgma-legacy-banner.webp',import.meta.url));
test('public homepage and resources page link the mascot introduction',()=>{
  assert.match(home,/href="mascot\/"[^>]*>청깨비 만나기/);
  assert.match(home,/resources\.js\?v=20261101-cheongkkaebi/);
  assert.match(catalog,/route\('\/mascot\/'\)/);
  assert.match(catalog,/상권브랜드·캐릭터/);
  assert.ok(pagesAsset.length>500);
});
test('mascot story matches archived original and no AI sources are exposed',()=>{
  for(const s of ['목포대의 청계구리','녕안, 만나서 반갑계굴~','청춘이 계속되는 거리','상인회','원본_AI_비공개'])
    assert.ok(page.includes(s),s);
  assert.match(page,/cgma-legacy-banner\.webp/);
  assert.doesNotMatch(page,/\.ai["']/);
  assert.doesNotMatch(page,/drive\.google\.com\/drive\/folders\//);
});
test('rights disclosure stays conditional, never claims ownership or registration',()=>{
  assert.match(page,/저작재산권 귀속.*확인 중/);
  assert.match(page,/상표등록 여부.*확인 중/);
  assert.match(page,/무단 복제·변형·재배포/);
  assert.doesNotMatch(page,/© 2024 청계면상인회/);
  assert.match(page,/https:\/\/cgma\.or\.kr\/mascot\//);
});
