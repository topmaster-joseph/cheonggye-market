import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {
  validateShareRequest,newShareToken,sha256,isValidToken,expiresSql,selectedDocuments
} from './functions/_shared/cgma-ip-share.js';
import {onRequestGet as adminList,onRequestPost as create,onRequestDelete as revoke} from './functions/api/ip-shares.js';
import {onRequestGet as external} from './functions/api/ip-share.js';

const defaults={recipient_email:'legal@example.org',document_ids:['cgma-ip-kipris-check'],expires_in_days:7,purpose:'변리사 사전 검토',confirm_limited_access:true};
const request=(path,method='GET',payload=null,authenticated=false)=>new Request('https://cgma.or.kr'+path,{method,headers:{...(authenticated?{Authorization:'Bearer testing'}:{}),...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined});

test('share requests enforce recipient, document allowlist, expiry and original-rights confirmation',()=>{
  assert.equal(validateShareRequest(defaults).ok,true);
  assert.equal(validateShareRequest({...defaults,recipient_email:'anyone'}).error,'recipient_email_invalid');
  assert.equal(validateShareRequest({...defaults,document_ids:['cgma-ip-archive-folder']}).error,'documents_invalid');
  assert.equal(validateShareRequest({...defaults,expires_in_days:365}).error,'expiration_invalid');
  assert.equal(validateShareRequest({...defaults,confirm_limited_access:false}).error,'acknowledgement_required');
  assert.equal(validateShareRequest({...defaults,document_ids:['cgma-ip-originals']}).error,'original_rights_confirmation_required');
  assert.equal(validateShareRequest({...defaults,document_ids:['cgma-ip-originals'],confirm_original_rights:true}).ok,true);
  assert.equal(selectedDocuments(['does-not-exist']).length,0);
  assert.match(expiresSql(7),/^\d{4}-\d{2}-\d{2} /);
  assert.ok(isValidToken(newShareToken()));
});

test('unauthenticated manager and invalid bearer tokens never return Drive URLs',async()=>{
  const response=await adminList({request:request('/api/ip-shares'),env:{}});
  assert.equal(response.status,401);
  assert.doesNotMatch(await response.text(),/drive\.google\.com/);
  const r=await external({request:request('/api/ip-share?token=wrong'),env:{}});
  assert.equal(r.status,404);
  assert.doesNotMatch(await r.text(),/drive\.google\.com/);
});

test('authorized invitation is hashed, scoped, revocable and independent from Drive ACL',async()=>{
  const previousFetch=globalThis.fetch;
  globalThis.fetch=async url=>{
    if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'test',email:'staff@example.org'});
    if(String(url).includes('/membership-api/pending'))return Response.json({reviewer:{authority:'tenant'}});
    throw Error('unexpected url '+url);
  };
  const state={shares:[]};
  const db={prepare(sql){
    return {
      bind(...args){this.args=args;return this},
      async run(){
        if(sql.startsWith('INSERT'))state.shares.push({id:this.args[0],token_hash:this.args[1],recipient_email:this.args[2],document_ids:this.args[3],purpose:this.args[4],created_by:this.args[5],created_at:'2026-11-02 00:00:00',expires_at:this.args[6],revoked_at:null});
        if(sql.startsWith('UPDATE')){const row=state.shares.find(x=>x.id===this.args[0]&&!x.revoked_at);if(row){row.revoked_at='2026-11-03 00:00:00';return {meta:{changes:1}}}return {meta:{changes:0}}}
        return {meta:{changes:0}};
      },
      async first(){
        if(sql.includes('COUNT(*)'))return {total:0};
        if(sql.includes('token_hash=?'))return state.shares.find(x=>x.token_hash===this.args[0]&&!x.revoked_at)??null;
        return null;
      },
      async all(){return {results:[...state.shares]}}
    }
  }};
  const env={cheonggye_market_notices:db};
  try{
    const created=await create({request:request('/api/ip-shares','POST',defaults,true),env});
    assert.equal(created.status,201);
    const data=await created.json();
    assert.equal(data.drive_permission_required,true);
    assert.equal(data.document_ids.length,1);
    const token=new URL(data.share_url).searchParams.get('token');
    assert.ok(isValidToken(token));
    assert.equal(state.shares[0].token_hash,await sha256(token));
    assert.ok(!JSON.stringify(state.shares[0]).includes(token));
    const listed=await adminList({request:request('/api/ip-shares','GET',null,true),env});
    assert.equal(listed.status,200);
    assert.equal((await listed.json()).items[0].recipient_email,defaults.recipient_email);
    const pub=await external({request:request('/api/ip-share?token='+token),env});
    assert.equal(pub.status,200);
    const pubData=await pub.json();
    assert.equal(pubData.documents.length,1);
    assert.equal(pubData.documents[0].id,'cgma-ip-kipris-check');
    assert.ok(pubData.documents[0].url.startsWith('https://drive.google.com/'));
    assert.ok(!JSON.stringify(pubData).includes(defaults.recipient_email));
    const rev=await revoke({request:request('/api/ip-shares?id='+data.id,'DELETE',null,true),env});
    assert.equal(rev.status,200);
    assert.equal((await rev.json()).google_drive_acl_unchanged,true);
    const after=await external({request:request('/api/ip-share?token='+token),env});
    assert.equal(after.status,404);
  }finally{globalThis.fetch=previousFetch}
});

test('share frontend and landing do not bake Drive IDs or permit search indexing',()=>{
  const read=f=>readFileSync(new URL(f,import.meta.url),'utf8');
  const admin=read('admin/index.html'),client=read('admin-ip-sharing.js');
  const landing=read('ip-share/index.html'),page=read('ip-share/share.js');
  assert.match(admin,/id="ipShareForm"/);
  assert.match(admin,/CGMA_IP_SHARING\?\.start\(session\)/);
  assert.match(client,/Google Drive.*권한/);
  assert.match(page,/credentials:'omit'/);
  assert.match(landing,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(landing,/name="referrer" content="no-referrer"/);
  for(const text of [admin,client,landing,page]){
    assert.doesNotMatch(text,/1L8vAKX_mjfjxcbluESFU3aoLDcAcE3ka/);
    assert.doesNotMatch(text,/1iMu0r-Chufl4b0Pjfpf-0tOPxkD2jJ9l/);
  }
});
