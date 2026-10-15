import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const index=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('./cgma-user-ui.css',import.meta.url),'utf8');
const auth=readFileSync(new URL('./central-auth-bridge.js',import.meta.url),'utf8');
const homeNav=readFileSync(new URL('./cgma-home-nav.js',import.meta.url),'utf8');

test('homepage exposes compact progressive services',()=>{
  assert.equal((index.match(/data-home-section=/g)||[]).length,3);
  const services=index.match(/<div class="home-services"[\s\S]*?<\/div>/)?.[0]||'';
  assert.ok(services);
  assert.equal(services.includes('<p'),false);
  assert.equal(index.includes('quick-start'),false);
  assert.ok(index.includes('cgma-home-nav.js?v=20261015-progressive-nav-v2'));
});

test('language picker is icon-free and pill-shaped',()=>{
  const picker=index.match(/<label class="language-picker"[\s\S]*?<\/label>/)?.[0]||'';
  assert.ok(picker);
  assert.equal(picker.includes('🌐'),false);
  assert.ok(css.includes('.header .language-picker'));
  assert.ok(css.includes('border-radius:999px'));
});

test('membership apply stays hidden until sign-in',()=>{
  assert.match(index,/data-member-apply data-auth-only[^>]*hidden/);
  assert.ok(auth.includes("link.matches('[data-auth-only]')"));
  assert.ok(auth.includes('link.hidden=!signedIn'));
  assert.ok(auth.includes("label.textContent=signedIn?'내 가게':'회원'"));
});

test('menu navigation reveals only the selected content group',()=>{
  assert.ok(homeNav.includes('function setCollapsed()'));
  assert.ok(homeNav.includes('function activateHomeGroup('));
  assert.ok(homeNav.includes("'market-map':['market-map','registered-market']"));
  assert.ok(homeNav.includes("member:['login','member-notice','join','join-form']"));
  assert.ok(homeNav.includes("event.target.closest('a[href^=\"#\"]')"));
});

test('progressive navigation has hidden-state, deep-link and accessibility guards',()=>{
  assert.match(css,/body\.cgma-user-page main > section\[hidden\]\{display:none!important\}/);
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(homeNav,/function hashTargetId\(/);
  assert.match(homeNav,/catch\{return '';\}/);
  assert.match(homeNav,/window\.addEventListener\('hashchange'/);
  assert.match(homeNav,/link\.setAttribute\('aria-current','location'\)/);
  assert.match(homeNav,/link\.removeAttribute\('aria-current'\)/);
});

test('human-centered homepage keeps legacy identity and sends pass to Cheonggye platform',()=>{
  assert.match(index,/cgma-photo-hero/);
  assert.match(index,/cgma-legacy-art/);
  assert.match(index,/cgma-legacy-banner\.webp/);
  assert.match(index,/청계패스 안내/);
  assert.match(index,/서비스 준비 중/);
  assert.match(index,/https:\/\/ekodi\.kr\/cheonggye\/pass/);
  assert.match(index,/cgma-home-redesign\.css\?v=20261015-human-home-v1/);
  assert.match(index,/data-home-only/);
  assert.match(index,/id="heroAll"/);
  assert.match(index,/id="heroBenefits"/);
  assert.match(homeNav,/homeOnlySections\.forEach\(section=>\{section\.hidden=true;/);
  assert.match(homeNav,/homeOnlySections\.forEach\(section=>\{section\.hidden=false;/);
  assert.match(index,/loading="lazy" decoding="async"/);
  assert.match(index,/href="member"/);
});

test('portrait source photos cannot stretch the hero height',()=>{
 const photoCss=readFileSync(new URL('./cgma-home-redesign.css',import.meta.url),'utf8');
 assert.match(photoCss,/cgma-hero-people\{position:relative;height:clamp\(340px,34vw,490px\)/);
 assert.match(photoCss,/cgma-hero-people img\{position:absolute;inset:0;/);
 assert.match(photoCss,/object-fit:cover;object-position:center 48%/);
});

test('official merchants festival hero uses real event footage and source credit',()=>{
 assert.match(index,/cgma-festival-hero/);
 assert.match(index,/2024 청계면상인회 가을 골목축제/);
 assert.match(index,/i\.ytimg\.com\/vi\/aF9hOSdgXSA\/maxresdefault\.jpg/);
 assert.match(index,/href="https:\/\/www\.youtube\.com\/watch\?v=aF9hOSdgXSA"/);
 assert.doesNotMatch(index,/photo-1733563549086-ab04a49181a5/);
 assert.match(index,/fetchpriority="high"/);
 assert.match(index,/sizes="\(max-width: 900px\) 100vw, 50vw"/);
});
