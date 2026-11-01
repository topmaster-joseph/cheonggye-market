import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('./admin/index.html', import.meta.url),'utf8');
const routes=readFileSync(new URL('./_redirects',import.meta.url),'utf8');
const nav=readFileSync(new URL('./admin-dashboard.js',import.meta.url),'utf8');

test('CGMA private workbench uses nonredirecting Pages HTML alias',()=>{
  assert.match(routes,/^\/operations-admin\/\*\s+\/admin\/index\.html\s+200$/m);
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(nav,/params\.get\('inline'\)==='1'/);
  assert.match(nav,/const embeddedId=params\.get\('section'\)/);
});

test('first-party embedded session never relies on tokens in URLs or permanent browser storage',()=>{
  assert.match(html,/async function embeddedSession\(\)/);
  assert.match(html,/location\.origin!=='https:\/\/ekodi\.kr'/);
  assert.match(html,/event\.source!==window\.parent\|\|event\.origin!==location\.origin/);
  assert.match(html,/event\.data\?\.type!=='ekodi:cgma-admin:session'/);
  assert.match(html,/window\.parent\.postMessage\(\{type:'ekodi:cgma-admin:ready'/);
  assert.doesNotMatch(html,/location\.(?:href|hash|search|assign)\s*=\s*(?:.*accessToken|.*session\.access_token)/);
  assert.doesNotMatch(html,/localStorage\.setItem\([^\n]*(?:accessToken|embedded)/);
});

test('standalone admin login remains and server tenant permission is rechecked',()=>{
  assert.match(html,/embedded\?\{present:false,ok:true\}:await consumeHandoff\(\)/);
  assert.match(html,/client\.auth\.getSession\(\)/);
  assert.match(html,/fetch\(route\('\/api\/admin-session'\)/);
  assert.match(html,/if\(!response\.ok\|\|!result\.allowed\)return deny/);
  assert.match(html,/window\.CGMA_MEMBER_REVIEW\?\.start\(session,result\)/);
});
test('embedded workbench inline bootstrap parses as JavaScript', async()=>{
  const { Script }=await import('node:vm');
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(Boolean);
  assert.ok(scripts.length>0);
  for(const source of scripts)assert.doesNotThrow(()=>new Script(source));
});
