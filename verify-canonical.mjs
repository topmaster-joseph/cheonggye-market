import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const canonical='https://ekodi.kr/cgma';
const pages=[['index.html','/cgma/'],['market-ai.html','/cgma/ai'],['member/index.html','/cgma/member/'],['store-admin.html','/cgma/store'],['admin/index.html','/cgma/admin/'],['resource/index.html','/cgma/resource/'],['member-admin/index.html','/cgma/member-admin/'],['order.html','/cgma/order/demo'],['payment-success.html','/cgma/payment-success'],['payment-fail.html','/cgma/payment-fail']];
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
const home=await readFile('index.html','utf8');assert.doesNotMatch(home,/class="ai-menu-disabled"/);assert.match(home,/id="adminNav"/);assert.match(home,/상인회 관리/);assert.doesNotMatch(home,/온라인 LIVE/);assert.match(home,/href="#live">온라인<\/a>/);assert.match(home,/id="siteLanguage"/);assert.match(home,/기획팀장/);assert.match(home,/정경탁/);assert.match(home,/양파창고/);
assert.equal([...home.matchAll(/id="resources"/g)].length,1);assert.doesNotMatch(home,/id="mapListToggle"/);assert.match(home,/class="map-center"/);assert.match(home,/id="resourceSearch"/);assert.ok(home.includes('cgma-sections.css?v=20260906-road-map-admin-v1'));assert.match(home,/leaflet@1\.9\.4/);assert.match(home,/OpenStreetMap/);
const pausedAi=await readFile('market-ai.html','utf8');assert.match(pausedAi,/현재 비활성화/);assert.doesNotMatch(pausedAi,/market-ai.js/);
const redirects=await readFile('_redirects','utf8');
for(const route of ['/ai ','/member ','/store ','/admin ','/member-admin ','/order/* ','/payment-success ','/payment-fail '])assert.ok(redirects.includes(route),`missing route ${route.trim()}`);
const adminGuard=await readFile('functions/_shared/cgma-admin.js','utf8');assert.match(adminGuard,/tenant=cheonggye/);assert.match(adminGuard,/tenant_admin_required/);
const sitePath=await readFile('site-path.js','utf8');assert.match(sitePath,/prefix='\/cgma'/);
const redesign=await readFile('cgma-sections.css','utf8');assert.match(redesign,/market-pin/);assert.match(redesign,/map-center/);assert.match(redesign,/CGMA real road map v8/);assert.match(redesign,/resource-filterbar/);const mapScript=await readFile('script.js','utf8');assert.match(mapScript,/ROAD_GEO/);assert.match(mapScript,/shopGeoPoint/);assert.match(mapScript,/L\.map/);assert.match(mapScript,/tile\.openstreetmap\.org/);assert.doesNotMatch(mapScript,/function mapIllustration/);assert.match(mapScript,/mapDirectoryCount/);assert.match(mapScript,/renderTodayDiscovery/);assert.match(mapScript,/revealRecommendedShop/);assert.match(mapScript,/benefitOnlyToggle/);assert.match(mapScript,/benefit-pin-badge/);assert.match(mapScript,/activeBenefitEntries/);assert.match(mapScript,/renderSceneRecommendations/);assert.match(mapScript,/sceneRecommendations/);assert.match(mapScript,/defaultScene/);assert.match(home,/id="sceneDiscovery"/);assert.match(home,/data-scene="lunch"/);assert.match(home,/id="todayDiscovery"/);assert.match(home,/id="todayPickRefresh"/);assert.match(home,/id="benefitOnlyToggle"/);const member=await readFile('member/index.html','utf8');assert.match(member,/storeRegistryState/);assert.match(member,/명단에 없는 신규 점포/);assert.match(member,/id="memberAdminEntry"/);const memberScript=await readFile('member.js','utf8');assert.match(memberScript,/점포 명단 상태/);assert.match(memberScript,/updateAdminEntry/);const storeAdmin=await readFile('store-admin.html','utf8');assert.match(storeAdmin,/id="insightDetail"/);assert.ok(storeAdmin.includes('store-admin.js?v=20260905-store-insights-v8'));const storeAdminScript=await readFile('store-admin.js','utf8');assert.match(storeAdminScript,/insightsApi/);assert.match(storeAdminScript,/renderInsights/);const eventApi=await readFile('functions/api/store-events.js','utf8');assert.match(eventApi,/cgma_store_events/);assert.match(eventApi,/authorizedStore/);assert.match(eventApi,/directions_click/);const archiveScript=await readFile('resources.js','utf8');assert.match(archiveScript,/data-resource-filter/);assert.match(archiveScript,/resourceSearch/);
console.log(`CGMA canonical contract OK: ${canonical}, ${pages.length} surfaces checked`);
