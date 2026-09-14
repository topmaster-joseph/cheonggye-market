import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const index=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('./cgma-user-ui.css',import.meta.url),'utf8');
const auth=readFileSync(new URL('./central-auth-bridge.js',import.meta.url),'utf8');
const homeNav=readFileSync(new URL('./cgma-home-nav.js',import.meta.url),'utf8');

test('homepage exposes compact progressive services',()=>{
  assert.equal((index.match(/data-home-section=/g)||[]).length,6);
  const services=index.match(/<div class="home-services"[\s\S]*?<\/div>/)?.[0]||'';
  assert.ok(services);
  assert.equal(services.includes('<p'),false);
  assert.equal(index.includes('quick-start'),false);
  assert.ok(index.includes('cgma-home-nav.js?v=20260915-progressive-v1'));
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
