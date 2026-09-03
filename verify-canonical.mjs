import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const canonical='https://ekodi.kr/cgma';
const pages=[['index.html','/cgma/'],['market-ai.html','/cgma/ai'],['member/index.html','/cgma/member/'],['store-admin.html','/cgma/store'],['admin/index.html','/cgma/admin'],['resource/index.html','/cgma/resource/'],['member-admin/index.html','/cgma/member-admin'],['order.html','/cgma/order/demo'],['payment-success.html','/cgma/payment-success'],['payment-fail.html','/cgma/payment-fail']];
const external=/^(?:https?:|mailto:|tel:|data:|javascript:|#)/i;
function rewritten(value,base){
 if(external.test(value)||value.startsWith('//'))return null;
 if(value.startsWith('/'))return value==='/cgma'||value.startsWith('/cgma/')?value:`/cgma${value}`;
 return new URL(value,`https://ekodi.kr${base}`).pathname;
}
for(const[file,base]of pages){
 const html=await readFile(file,'utf8');
 for(const match of html.matchAll(/(?:href|src|action)="([^"]+)"/g)){
  const path=rewritten(match[1],base);if(path)assert.ok(path==='/cgma'||path.startsWith('/cgma/'),`${file}: ${match[1]} escapes CGMA root as ${path}`);
 }
}
const home=await readFile('index.html','utf8');assert.match(home,/class="ai-menu-disabled"/);assert.match(home,/aria-disabled="true"/);assert.doesNotMatch(home,/href="ai">청계상권 AI/);assert.match(home,/기획팀장/);assert.match(home,/정경탁/);assert.match(home,/양파창고/);
assert.equal([...home.matchAll(/id="resources"/g)].length,1);assert.match(home,/id="mapListToggle"/);assert.match(home,/id="resourceSearch"/);assert.ok(home.includes('cgma-sections.css?v=20260903-readability'));
const pausedAi=await readFile('market-ai.html','utf8');assert.match(pausedAi,/현재 비활성화/);assert.doesNotMatch(pausedAi,/market-ai.js/);
const redirects=await readFile('_redirects','utf8');
for(const route of ['/ai ','/member ','/store ','/admin ','/member-admin ','/order/* ','/payment-success ','/payment-fail '])assert.ok(redirects.includes(route),`missing route ${route.trim()}`);
const adminGuard=await readFile('functions/_shared/cgma-admin.js','utf8');assert.match(adminGuard,/tenant=cheonggye/);assert.match(adminGuard,/tenant_admin_required/);
const sitePath=await readFile('site-path.js','utf8');assert.match(sitePath,/prefix='\/cgma'/);
const redesign=await readFile('cgma-sections.css','utf8');assert.match(redesign,/map-workspace\.list-hidden/);assert.match(redesign,/resource-filterbar/);const mapScript=await readFile('script.js','utf8');assert.match(mapScript,/mapDirectoryCount/);const archiveScript=await readFile('resources.js','utf8');assert.match(archiveScript,/data-resource-filter/);assert.match(archiveScript,/resourceSearch/);
console.log(`CGMA canonical contract OK: ${canonical}, ${pages.length} surfaces checked`);