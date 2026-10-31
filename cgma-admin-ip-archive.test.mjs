import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {onRequestGet} from './functions/api/ip-archive.js';

const root=new URL('./',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');
const secretLinks=['1L8vAKX_mjfjxcbluESFU3aoLDcAcE3ka','1iMu0r-Chufl4b0Pjfpf-0tOPxkD2jJ9l','1Hj-KSJspsl1SaSiXNIinuAS7n2Ghsh2z'];
function request(token){return new Request('https://cgma.or.kr/api/ip-archive',token?{headers:{Authorization:'Bearer '+token}}:{})}

test('public unauthenticated requests return no document URLs',async()=>{
  const response=await onRequestGet({request:request()});
  assert.equal(response.status,401);
  assert.match(response.headers.get('Cache-Control'),/no-store/);
  const body=await response.text();
  assert.match(body,/login_required/);
  assert.doesNotMatch(body,/drive\.google\.com/);
  for(const id of secretLinks)assert.ok(!body.includes(id));
});

test('tenant administration is checked before any document link is returned',async()=>{
  const old=globalThis.fetch;
  globalThis.fetch=async url=>{
    if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'user-1',email:'admin@example.org'});
    if(String(url).includes('/membership-api/pending'))return Response.json({error:'forbidden'},{status:403});
    throw Error('unexpected auth endpoint');
  };
  try{
    const response=await onRequestGet({request:request('testing-token')});
    assert.equal(response.status,403);
    assert.doesNotMatch(await response.text(),/drive\.google\.com/);
  }finally{globalThis.fetch=old}
});

test('verified tenant admin sees five already-archived links',async()=>{
  const old=globalThis.fetch;
  globalThis.fetch=async url=>{
    if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'user-1',email:'admin@example.org'});
    if(String(url).includes('/membership-api/pending'))return Response.json({reviewer:{authority:'tenant'}});
    throw Error('unexpected authentication endpoint');
  };
  try{
    const response=await onRequestGet({request:request('testing-token')});
    assert.equal(response.status,200);
    assert.match(response.headers.get('Cache-Control'),/private/);
    assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
    const data=await response.json();
    assert.equal(data.ok,true);
    assert.equal(data.scope,'tenant:cheonggye');
    assert.equal(data.documents.length,5);
    assert.equal(new Set(data.documents.map(x=>x.id)).size,5);
    assert.ok(data.documents.every(x=>x.url.startsWith('https://drive.google.com/')));
    assert.match(data.notice,/출원·등록은 완료되지/);
  }finally{globalThis.fetch=old}
});

test('private links are never embedded in public HTML or client JS',()=>{
  const admin=read('admin/index.html');
  const client=read('admin-ip-archive.js');
  const home=read('index.html');
  const publicResources=read('resources.js');
  const groups=read('admin-dashboard.js');
  assert.match(admin,/id="ipArchive"/);
  assert.match(admin,/CGMA_IP_ARCHIVE\?\.start\(session\)/);
  assert.match(admin,/href="#ipArchive"/);
  assert.match(groups,/panels:\['controlTower','petitionManager','ipArchive'\]/);
  assert.match(groups,/params\.get\('section'\)/);
  for(const file of [admin,client,home,publicResources]){
    for(const id of secretLinks)assert.ok(!file.includes(id),'private Drive ID leaked in client');
  }
});
