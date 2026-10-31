import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=p=>readFileSync(new URL('./'+p,import.meta.url),'utf8');
const src=read('programs/ai-marketing-2026/manage/app.js');
const css=read('programs/ai-marketing-2026/manage/style.css');
const migration=read('migrations/supabase/20261024_cgma_ai_edu_bulk_status.sql');
const UUIDS=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
const applicants=()=>UUIDS.map((id,i)=>({id,status:i===2?'확정':'접수',name:'신청인'+i,store_name:'가게'+i,role:'대표',created_at:'2026-10-24T09:00:00Z',phone:'01012345678',receipt_no:'R'+i,business_type:'음식점'}));
const tick=()=>new Promise(r=>setImmediate(r));

async function mount({guest=false,bulkFail=false,individualFail=false,confirm=true}={}){
  const elements=new Map(),calls=[],records=applicants();
  let confirmations=0;
  const elt=id=>{
    if(!elements.has(id))elements.set(id,{
      id,hidden:id==='cgma-manage-logout',innerHTML:'',textContent:'',value:'',checked:false,disabled:false,indeterminate:false,href:'',style:{},
      listeners:{},classList:{add(){},toggle(){}},contains(){return false},scrollIntoView(){},querySelectorAll(){return []},
      addEventListener(type,cb){this.listeners[type]=cb}
    });
    return elements.get(id);
  };
  const api={
    esc:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),
    token:()=>guest?null:'test-token',
    isAdmin:async()=>!guest,
    currentUser:async()=>guest?null:{id:'user'},
    signOut:async()=>{},
    authError:()=>'',loginUrl:()=> 'https://ekodi.kr/auth/?site=cgma',
    async rpc(name,body,{auth}={}){
      calls.push({name,body,auth});
      if(guest)throw Error('unauthorized');
      if(name==='cgma_ai_edu_2026_admin_list')return {ok:true,rows:records.map(r=>({...r})),settings:{capacity:15,is_open:true}};
      if(name==='cgma_ai_edu_2026_admin_update'){
        if(individualFail)return {ok:false,error:'denied'};
        const row=records.find(r=>r.id===body.p_id);Object.assign(row,body.p_patch);
        return {ok:true};
      }
      if(name==='cgma_ai_edu_2026_admin_bulk_status'){
        if(bulkFail)return {ok:false,error:'denied'};
        let count=0;for(const row of records)if(body.p_ids.includes(row.id)&&row.status!==body.p_status){row.status=body.p_status;count++}
        return {ok:true,selected:body.p_ids.length,changed:count,status:body.p_status};
      }
      throw Error('unexpected RPC '+name);
    }
  };
  const document={getElementById:elt,documentElement:{classList:{add(){}}},activeElement:null};
  const loc={hash:'',pathname:'/programs/ai-marketing-2026/manage/',search:'',replace(){}};
  runInNewContext(src,{document,location:loc,window:{CGMA_PROGRAMS:api,confirm:()=>{confirmations++;return confirm}},Date,URL,setInterval:()=>1,setTimeout:()=>1,navigator:{}});
  await tick();await tick();
  return {elt,calls,records,get confirmations(){return confirmations}};
}

test('compact list exposes 1 row selector and 1 direct status menu per applicant',async()=>{
  const t=await mount();
  const html=t.elt('m-body').innerHTML;
  assert.equal((html.match(/data-select/g)||[]).length,3);
  assert.equal((html.match(/data-status-row/g)||[]).length,3);
  assert.match(html,/신청인0 접수상태 변경/);
  assert.match(html,/<option selected>접수<\/option>/);
  assert.match(html,/<option selected>확정<\/option>/);
  assert.match(html,/data-expand/);
  assert.doesNotMatch(html,/연락처|admin_memo|data-memo/,'collapsed rows keep private details closed');
  assert.match(t.elt('m-bulk-apply').textContent,/선택 0명 변경/);
  assert.equal(t.elt('m-bulk-apply').disabled,true);
});

test('one applicant status saves immediately through existing authorized RPC',async()=>{
  const t=await mount();
  const tr={dataset:{id:UUIDS[0]}},statusCell={querySelector:()=>t.elt('saved')};
  const target={value:'대기',matches:s=>s==='[data-status-row]',closest:s=>s==='tr[data-id]'?tr:s==='.m-state-cell'?statusCell:null};
  await t.elt('m-body').listeners.change({target});
  const changes=t.calls.filter(x=>x.name==='cgma_ai_edu_2026_admin_update');
  assert.equal(changes.length,1);
  assert.equal(changes[0].body.p_id,UUIDS[0]);
  assert.equal(changes[0].body.p_patch.status,'대기');
  assert.equal(changes[0].auth,true);
  assert.equal(t.records[0].status,'대기');
  assert.match(t.elt('m-msg').textContent,/신청인0.*대기/);
  assert.match(t.elt('m-body').innerHTML,/<option selected>대기<\/option>/);
});

test('single-row status failure restores previous selection and displays error',async()=>{
  const t=await mount({individualFail:true});
  const tr={dataset:{id:UUIDS[0]}},statusCell={querySelector:()=>t.elt('saved')};
  const target={value:'대기',matches:s=>s==='[data-status-row]',closest:s=>s==='tr[data-id]'?tr:s==='.m-state-cell'?statusCell:null};
  await t.elt('m-body').listeners.change({target});
  assert.equal(target.value,'접수');
  assert.equal(t.records[0].status,'접수');
  assert.match(t.elt('saved').textContent,/저장 실패/);
});

test('bulk toolbar selects only displayed applicants and makes one atomic RPC',async()=>{
  const t=await mount();
  // Explicit multi-selection; unrelated rows must not be modified.
  for(const id of UUIDS.slice(0,2)){
    await t.elt('m-body').listeners.change({target:{
      value:id,checked:true,matches:s=>s==='[data-select]'
    }});
  }
  assert.equal(t.elt('m-bulk-apply').disabled,true,'bulk action requires an explicit target state');
  t.elt('m-bulk-status').value='확정';
  t.elt('m-bulk-status').onchange();
  assert.equal(t.elt('m-bulk-apply').disabled,false);
  await t.elt('m-bulk-apply').onclick();
  assert.equal(t.confirmations,1);
  const bulk=t.calls.filter(x=>x.name==='cgma_ai_edu_2026_admin_bulk_status');
  assert.equal(bulk.length,1);
  assert.equal(bulk[0].auth,true);
  assert.equal(bulk[0].body.p_pin,null);
  assert.deepEqual([...bulk[0].body.p_ids],UUIDS.slice(0,2));
  assert.equal(bulk[0].body.p_status,'확정');
  assert.deepEqual(t.records.map(r=>r.status),['확정','확정','확정']);
  assert.match(t.elt('m-msg').textContent,/2명 일괄 변경 완료/);
  assert.equal(t.elt('m-bulk-apply').disabled,true);
});

test('cancel and server failures never falsely report a successful bulk update',async()=>{
  const cancel=await mount({confirm:false});
  cancel.elt('m-select-visible').onclick();
  cancel.elt('m-bulk-status').value='취소';
  cancel.elt('m-bulk-status').onchange();
  await cancel.elt('m-bulk-apply').onclick();
  assert.equal(cancel.calls.filter(x=>x.name.endsWith('bulk_status')).length,0);

  const t=await mount({bulkFail:true});
  t.elt('m-select-visible').onclick();
  t.elt('m-bulk-status').value='대기';
  t.elt('m-bulk-status').onchange();
  await t.elt('m-bulk-apply').onclick();
  assert.match(t.elt('m-msg').textContent,/일괄 변경 실패/);
  assert.equal(t.records[0].status,'접수');
  assert.match(t.elt('m-selected-count').textContent,/3명 선택/);
});

test('guest cannot invoke private bulk RPC, and filter changes clear stale selection',async()=>{
  const guest=await mount({guest:true});
  assert.equal(guest.calls.length,0);
  assert.doesNotMatch(guest.elt('manage').innerHTML,/m-roster|m-bulk-apply/);
  const t=await mount();t.elt('m-select-visible').onclick();
  assert.match(t.elt('m-selected-count').textContent,/3명 선택/);
  t.elt('m-st').value='확정';t.elt('m-st').onchange();
  assert.match(t.elt('m-selected-count').textContent,/0명 선택/);
});

test('SQL bulk status function rechecks auth, locks selected records and audits each change',()=>{
  assert.match(migration,/auth\.uid\(\) is null/);
  assert.match(migration,/cgma_ai_edu_2026_check_pin\(p_pin\)/);
  assert.match(migration,/cardinality\(p_ids\) > 100/);
  assert.match(migration,/status not in \('접수','확정','대기','취소'\)/);
  assert.match(migration,/for update/);
  assert.match(migration,/v_found <> v_selected/);
  assert.match(migration,/bulk_status_update/);
  assert.match(migration,/from changed c/);
  assert.match(migration,/revoke all on function public\.cgma_ai_edu_2026_admin_bulk_status/);
  assert.match(migration,/grant execute on function public\.cgma_ai_edu_2026_admin_bulk_status/);
  assert.doesNotMatch(migration,/\bservice_role\b|grant execute .* to anon/i);
  assert.match(css,/\.manage-page \.m-bulk/);
});
