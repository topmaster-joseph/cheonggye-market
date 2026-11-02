import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('./admin-language-management.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('./admin/index.html',import.meta.url),'utf8');
const dashboard=fs.readFileSync(new URL('./admin-dashboard.js',import.meta.url),'utf8');

function harness(fetchImpl){
  const nodes=new Map();
  const makeNode=()=>({
    textContent:'',className:'',innerHTML:'',hidden:true,disabled:false,children:[],
    addEventListener(){},querySelectorAll(){return []},
    replaceChildren(...children){this.children=children},
    appendChild(child){this.children.push(child)}
  });
  const document={
    getElementById(id){if(!nodes.has(id))nodes.set(id,makeNode());return nodes.get(id)},
    createElement(){return makeNode()}
  };
  const window={};
  const context={document,window,fetch:fetchImpl,console:{error(){}}};
  vm.runInNewContext(source,context);
  const start=()=>window.CGMA_LANGUAGE_ADMIN.start({access_token:'test-only'});
  const settle=()=>new Promise(resolve=>setImmediate(resolve));
  return {nodes,get:id=>document.getElementById(id),start,settle,api:window.CGMA_LANGUAGE_ADMIN};
}

test('backend unavailable never displays a misleading numeric zero',async()=>{
  const h=harness(async()=>{throw new Error('network_offline')});
  h.start();
  await h.settle();
  assert.equal(h.get('languagePublishedCount').textContent,'—');
  assert.equal(h.get('languageReadyCount').textContent,'—');
  assert.match(h.get('languageAdminStatus').textContent,/연결에 실패/);
  assert.match(h.get('languageAdminList').children[0].textContent,/0개로 간주하지 않습니다/);
  assert.equal(h.get('languageAdminRefresh').disabled,false);
});

test('valid empty authoritative language list is displayed as zero',async()=>{
  const h=harness(async()=>({ok:true,status:200,json:async()=>({site:{languages:[]}})}));
  h.start();
  await h.settle();
  assert.equal(h.get('languagePublishedCount').textContent,'0개');
  assert.equal(h.get('languageReadyCount').textContent,'0개');
  assert.match(h.get('languageAdminStatus').textContent,/확인 완료/);
});

test('malformed status is unknown, not zero',async()=>{
  const h=harness(async()=>({ok:true,status:200,json:async()=>({site:{}})}));
  h.start();
  await h.settle();
  assert.equal(h.get('languagePublishedCount').textContent,'—');
  assert.match(h.get('languageAdminStatus').textContent,/연결에 실패/);
});

test('valid publication snapshot reports trusted counts, and later errors clear them',async()=>{
  let response={site:{languages:[
    {locale:'ko-KR',status:'source',public:true},
    {locale:'en',status:'published',public:true},
    {locale:'ja',status:'validating',public:false}
  ]}};
  const h=harness(async()=>({ok:true,status:200,json:async()=>response}));
  h.start();
  await h.settle();
  assert.equal(h.get('languagePublishedCount').textContent,'2개');
  assert.equal(h.get('languageReadyCount').textContent,'2개');
  response={};
  await h.api.load();
  assert.equal(h.get('languagePublishedCount').textContent,'—');
  assert.equal(h.get('languageReadyCount').textContent,'—');
});

test('admin heading follows selected workspace group without a duplicate navigation shortcut',()=>{
  assert.match(html,/id="adminViewTitle"/);
  assert.match(dashboard,/heading\.textContent=groupLabel/);
  assert.match(html,/href="\.\.\/">사용자 화면에서 관리/);
  assert.doesNotMatch(html,/class="admin-side-foot"/);
  assert.doesNotMatch(html,/href="\.\.\/">점포·공지·자료 관리/);
  assert.match(dashboard,/panel\.removeAttribute\('aria-labelledby'\)/);
});

test('CGMA public/admin/customer interfaces use the live canonical EKODI API origin',()=>{
  const i18n=fs.readFileSync(new URL('./cgma-i18n.js',import.meta.url),'utf8');
  const client=fs.readFileSync(new URL('./client.js',import.meta.url),'utf8');
  const clientHtml=fs.readFileSync(new URL('./client/index.html',import.meta.url),'utf8');
  const publicHtml=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
  assert.match(source,/const API='https:\/\/ekodi\.kr\/api\/i18n\/v1\/admin'/);
  assert.match(i18n,/PUBLICATION_STATUS_URL='https:\/\/ekodi\.kr\/api\/i18n\/v1\/status\?service=cgma'/);
  assert.match(client,/const API='https:\/\/ekodi\.kr'/);
  assert.match(clientHtml,/connect-src https:\/\/ekodi\.kr /);
  assert.match(clientHtml,/client\.js\?v=20261103-canonical-api-v1/);
  assert.match(publicHtml,/cgma-i18n\.js\?v=20261103-canonical-api-v1/);
  for(const file of [source,i18n,client,clientHtml]){
    assert.doesNotMatch(file,/api\.ekodi\.kr/);
  }
});
