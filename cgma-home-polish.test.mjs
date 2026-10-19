import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {onRequestGet as getNotices} from './functions/api/notices.js';

const read=name=>readFile(new URL('./'+name,import.meta.url),'utf8');

test('public notices never expose the editor e-mail',async()=>{
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE notices(id INTEGER PRIMARY KEY,title TEXT,content TEXT,category TEXT,author TEXT,pinned INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT)`);
  const insert=sqlite.prepare('INSERT INTO notices(title,content,category,author) VALUES(?,?,?,?)');
  insert.run('A','a','공지','chair@cgma.or.kr');
  insert.run('B','b','공지','');
  insert.run('C','c','공지','청계면상인회 사무국');
  const stmt=(sql,args=[])=>({bind:(...n)=>stmt(sql,n),async all(){return {results:sqlite.prepare(sql).all(...args)}}});
  const res=await getNotices({env:{cheonggye_market_notices:{prepare:sql=>stmt(sql)}}});
  const body=await res.json();
  assert.equal(res.status,200);
  assert.doesNotMatch(JSON.stringify(body),/@/,'no e-mail address may appear in the public payload');
  assert.deepEqual(body.items.map(i=>i.author).sort(),['청계면상인회','청계면상인회','청계면상인회 사무국'].sort());
  // The stored audit value is untouched.
  assert.equal(sqlite.prepare("SELECT author FROM notices WHERE title='A'").get().author,'chair@cgma.or.kr');
});

test('menu views open on their content: hero and festival notice are home-only',async()=>{
  const html=await read('index.html');
  assert.match(html,/<section class="hero cgma-hero cgma-photo-hero" id="top" data-home-only/);
  assert.match(html,/<section class="cgma-festival-alert" data-home-only/);
});

test('mobile dock includes the schedule and lays out any number of items',async()=>{
  const [html,css]=await Promise.all([read('index.html'),read('cgma-user-ui.css')]);
  const dock=html.match(/<nav class="cgma-mobile-dock"[\s\S]*?<\/nav>/)?.[0]||'';
  assert.match(dock,/href="#schedule"><span>▦<\/span>일정<\/a>/);
  assert.equal((dock.match(/<a /g)||[]).length,5);
  assert.match(css,/\.cgma-mobile-dock\{position:fixed;display:grid;grid-auto-flow:column;grid-auto-columns:minmax\(0,1fr\)/);
});

test('share preview metadata points at a real 1200x630 image',async()=>{
  const html=await read('index.html');
  for(const tag of ['og:title','og:description','og:url','og:image','og:site_name'])assert.match(html,new RegExp(`property="${tag}" content="[^"]+"`),tag);
  assert.match(html,/property="og:image" content="https:\/\/cgma\.or\.kr\/cgma-og-1200x630\.jpg"/);
  assert.match(html,/name="twitter:card" content="summary_large_image"/);
  const image=await stat(new URL('./cgma-og-1200x630.jpg',import.meta.url));
  assert.ok(image.size>10000&&image.size<300000,'og image exists with a sane size');
});

test('logo returns to the home view even after cgma-i18n handled the click',async()=>{
  const nav=await read('cgma-home-nav.js');
  assert.match(nav,/function isSamePageHome\(link\)/);
  assert.match(nav,/function goHome\(\)\{\n  setCollapsed\(\);/);
  // The home branch must run before the defaultPrevented early-return.
  assert.ok(nav.indexOf('isSamePageHome(homeLink)')<nav.indexOf('if(event.defaultPrevented)return;'));
});
