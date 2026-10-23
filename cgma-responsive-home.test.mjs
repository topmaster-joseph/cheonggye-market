import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('./'+name,import.meta.url),'utf8');
const html=read('index.html');
const css=read('cgma-modern-home.css');
const calendar=read('schedule-board.js');

test('the landing photo and live calendar share one desktop row',()=>{
 assert.match(html,/<section class="cgma-home-stage" data-home-only/);
 assert.ok(html.indexOf('class="hero cgma-hero cgma-photo-hero"') < html.indexOf('class="cgma-home-calendar"'));
 assert.ok(html.indexOf('class="cgma-home-calendar"') < html.indexOf('class="cgma-festival-alert"'));
 assert.match(css,/\.cgma-home-stage\{display:grid;grid-template-columns:/);
 assert.match(css,/@media\(max-width:960px\)\{/);
 assert.match(css,/\.cgma-home-stage\{grid-template-columns:minmax\(0,1fr\)/);
});

test('home preview and complete schedule are fed by the existing public API',()=>{
 assert.equal((html.match(/id="schedulePreview"/g)||[]).length,1);
 assert.equal((html.match(/id="cgmaHomeCalendar"/g)||[]).length,1);
 assert.match(calendar,/function renderHomeCalendar\(\)/);
 assert.match(calendar,/renderApp\(\);renderPreview\(\);renderHomeCalendar\(\);/);
 assert.match(calendar,/\/api\/schedule\?/);
 assert.match(calendar,/state\.items\.filter\(item=>covers\(item,date\)\)/);
 assert.match(calendar,/el\.setAttribute\('aria-label',dot\(date\)/);
 assert.doesNotMatch(calendar,/innerHTML\s*=/);
});

test('verified association social destinations open safely',()=>{
 assert.match(html,/https:\/\/www\.youtube\.com\/@cgma4989/);
 assert.match(html,/https:\/\/www\.youtube\.com\/@cgma4989\/live/);
 assert.match(html,/https:\/\/lit\.link\/cgma/);
 assert.match(html,/class="cgma-social-home" data-home-only/);
 assert.doesNotMatch(html,/instagram\.com\/cgma4989|facebook\.com\/cgma4989/);
 assert.match(html,/target="_blank" rel="noopener noreferrer"/);
});

test('Korean display fonts, keyboard navigation, mobile breakpoint and hidden state',()=>{
 assert.match(html,/family=Noto\+Sans\+KR/);
 assert.match(css,/font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic"/);
 assert.match(css,/\.cgma-home-stage\[hidden\]/);
 assert.match(css,/@media\(max-width:720px\)\{/);
 assert.match(css,/\.cgma-compact-day:focus-visible/);
 assert.match(html,/class="menu-btn" aria-expanded="false" aria-controls="nav"/);
});
