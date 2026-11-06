import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const get=async name=>readFile(new URL('./'+name,import.meta.url),'utf8');

test('association has discoverable, scoped, persistent compact section tabs',async()=>{
  const html=await get('index.html');
  const nav=html.match(/<nav class="cgma-section-tabs"[\s\S]*?<\/nav>/)?.[0]||'';
  assert.match(nav,/aria-label="청계면상인회 분야별 바로가기"/);
  assert.equal((nav.match(/<a\b/g)||[]).length,9);
  for(const [label,target] of Object.entries({
    '첫화면':'#top','일정·달력':'#schedule','상점·상권지도':'#market-map',
    '공지·공식자료':'#resources','상권소식':'#news','교육·행사신청':'programs/',
    '상인회 소개':'#about','온라인 소통':'#live','회원·가입':'#login',
  })){
    assert.ok(nav.includes('href="'+target+'"')&&nav.includes(label),label);
  }
  assert.match(html,/cgma-compact-tabs\.css\?v=20261106-v1/);
});

test('tab navigation and existing deep-link behavior use the same selected section',async()=>{
  const [html,nav]=await Promise.all([get('index.html'),get('cgma-home-nav.js')]);
  assert.match(html,/<a href="#schedule" data-home-section="schedule">일정·달력<\/a>/);
  assert.match(nav,/link\.dataset\.homeSection===group/);
  assert.match(nav,/link\.setAttribute\('aria-current','location'\)/);
  assert.match(nav,/function openFromHash\(/);
  assert.match(nav,/function goHome\(/);
  assert.match(nav,/if\(id==='top'\)/);
});

test('public association compact layout retains calendar and hides unpublished cross-site promotions',async()=>{
  const [html,css]=await Promise.all([get('index.html'),get('cgma-compact-tabs.css')]);
  assert.match(html,/id="cgmaHomeCalendar"/);
  assert.match(css,/\.cgma-home-stage>\.hero\.cgma-photo-hero\{/);
  assert.match(css,/height:345px;min-height:345px;max-height:345px/);
  assert.match(css,/\.cgma-home-calendar\{/);
  assert.match(css,/max-height:345px;overflow:auto/);
  assert.match(css,/\.cgma-pass-link,/);
  assert.match(css,/\.cgma-member-benefits\{display:none!important\}/);
  assert.match(css,/scroll-snap-type:x proximity/);
  assert.match(css,/@media\(max-width:720px\)/);
});
