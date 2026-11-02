import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html=readFileSync(new URL('./admin/index.html', import.meta.url),'utf8');
const nav=readFileSync(new URL('./admin-dashboard.js',import.meta.url),'utf8');
const redirects=readFileSync(new URL('./_redirects',import.meta.url),'utf8');

test('operations-admin reuses the exact existing legacy admin document',()=>{
  assert.match(redirects,/^\/operations-admin\/\*\s+\/admin\/index\.html\s+200$/m);
  assert.ok(!redirects.includes('/admin  /operations-admin'));
});
test('inline same-origin token handoff is strict and has no token URL transport',()=>{
  assert.ok(html.includes('async function embeddedSession()'));
  assert.ok(html.includes("url.origin==='https://ekodi.kr'"));
  assert.ok(html.includes("url.pathname==='/cgma/operations-admin/'"));
  assert.ok(html.includes("event.source!==window.parent||event.origin!=='https://ekodi.kr'"));
  assert.ok(html.includes("event.data?.type!=='ekodi:cgma-admin:session'"));
  assert.ok(html.includes("window.parent.postMessage({type:'ekodi:cgma-admin:ready',section},'https://ekodi.kr')"));
  assert.ok(!html.includes('searchParams.set(\'accessToken\''));
});
test('only six planned sensitive menu sections are accepted for embedding',()=>{
  const allowed="['memberReview','festivalManager','controlTower','petitionManager','ipArchive','educationSurveyManager']";
  assert.ok(html.includes(allowed));
  assert.ok(html.includes('if(!allowed.has(section)||window.parent===window)'));
  assert.ok(nav.includes("const embeddedId=params.get('section')"));
  assert.ok(nav.includes("if(inline)return panels.includes(embeddedId)?embeddedId:null"));
});
test('legacy non-inline sign-in and server tenant permission remain intact',()=>{
  assert.ok(html.includes('else{const {data}=await client.auth.getSession();session=data.session;}'));
  assert.ok(html.includes("fetch(route('/api/admin-session')"));
  assert.ok(html.includes('if(!response.ok||!result.allowed)return deny('));
  assert.ok(html.includes('window.CGMA_MEMBER_REVIEW?.start(session,result)'));
});
test('embedded admin hides nested navigation and reports bounded height',()=>{
  assert.ok(html.includes("document.documentElement.classList.add('cgma-embedded-workbench')"));
  assert.ok(html.includes('html.cgma-embedded-workbench .admin-side'));
  assert.ok(html.includes('Math.min(5000,Math.max(260,document.body.scrollHeight))'));
});
test('all inline scripts remain valid JavaScript',()=>{
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
  assert.ok(scripts.length>0);
  for(const script of scripts) assert.doesNotThrow(()=>new Script(script));
});
