import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';

const workflow=readFileSync(new URL('./.github/workflows/pages-health.yml',import.meta.url),'utf8');
const start=workflow.indexOf('      - name: Verify public routes');
const end=workflow.indexOf('      - name: Write health summary',start);
assert.ok(start>=0&&end>start,'Cloudflare Pages route-verification step must exist');
const verify=workflow.slice(start,end);
const run=verify.slice(verify.indexOf('        run: |')+'        run: |'.length)
  .split('\n').map(line=>line.startsWith('          ')?line.slice(10):line.trim()===''?'':line).join('\n');
const shell=process.platform==='win32'?'C:/Program Files/Git/bin/bash.exe':'bash';
const routes=new Map([
  ['/','청계면상인회 | 오늘도 청계에서 만나요'],
  ['/ai','청계상권 Marketing AI | 현재 비활성화'],
  ['/member','회원 계정 · 정회원 신청 | 청계면상인회'],
  ['/store-admin','내 가게 운영 | 청계상권 AI'],
  ['/admin/','id="adminViewTitle"'],
  ['/client/','id="authTitle"'],
  ['/programs/','id="programsHub"'],
  ['/programs/ai-marketing-2026/manage/','id="manager-title"']
]);

async function probe({brokenPath=null}={}){
  const server=createServer((req,res)=>{
    const expected=routes.get(new URL(req.url,'http://localhost').pathname);
    if(!expected){res.writeHead(404);res.end('not found');return;}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    // A real homepage is long enough that grep -q may close early, causing SIGPIPE.
    res.end((expected==='청계면상인회 | 오늘도 청계에서 만나요'?'x'.repeat(2_000_000):'')+
      (req.url===brokenPath?'missing expected marker':expected)+'<main>OK</main>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const baseUrl='http://127.0.0.1:'+server.address().port;
  try{
    return await new Promise((resolve,reject)=>{
      const child=spawn(shell,['-c',run.replaceAll('sleep 3','sleep 0.01')],{
        env:{...process.env,BASE_URL:baseUrl},stdio:['ignore','pipe','pipe']
      });
      let stdout='',stderr='';
      child.stdout.on('data',chunk=>stdout+=String(chunk));
      child.stderr.on('data',chunk=>stderr+=String(chunk));
      child.once('error',reject);
      child.once('close',code=>resolve({code,stdout,stderr}));
    });
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
}

test('health workflow cannot interpret a pipefail SIGPIPE as site downtime',()=>{
  assert.match(run,/set -euo pipefail/);
  assert.match(run,/\[\[ "\$body" == \*"\$expected"\* \]\]/);
  assert.doesNotMatch(run,/printf[^\n]*\|\s*grep\s+-Fq/);
  assert.doesNotMatch(run,/\|\s*head/);
  for(const [path,marker] of routes){
    assert.ok(run.includes('check_route "'+path+'"'),'missing health check: '+path);
    assert.ok(run.includes(marker),'missing expected marker: '+path);
  }
});

test('the real health workflow succeeds with multi-megabyte HTML and all admin links',async()=>{
  const result=await probe();
  assert.equal(result.code,0,result.stdout+'\n'+result.stderr);
  for(const path of routes.keys())assert.ok(result.stdout.includes('OK '+path+' contains:'),path);
  assert.doesNotMatch(result.stderr,/Broken pipe|write error/);
});

test('the real health workflow still flags missing admin content',async()=>{
  const result=await probe({brokenPath:'/admin/'});
  assert.notEqual(result.code,0,'a missing admin page must be a genuine health failure');
  assert.match(result.stdout,/FAILED \/admin\/: expected text not found/);
});
