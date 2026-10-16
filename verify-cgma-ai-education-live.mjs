// Read-only checks against deployed survey routes. NEVER write survey submissions here.
import assert from 'node:assert/strict';

const targets=[
  {base:'https://ekodi.kr/cgma/ai-education',html:'/',script:'/app.js',schema:'/questions.mjs',stats:'/api/stats',responses:'/api/responses'},
  {base:'https://cheonggye-market.pages.dev/ai-education',html:'/',script:'/app.js',schema:'/questions.mjs',stats:'/../api/ai-education-stats',responses:'/../api/ai-education-responses'}
];

async function get(url){
  let last;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const response=await fetch(url,{method:'GET',redirect:'manual',headers:{accept:'*/*'},signal:AbortSignal.timeout(15000)});
      const text=await response.text();
      // Retry 5xx only; failed invariants or permissions require investigation.
      if(response.status>=500&&attempt===0){last=new Error('HTTP '+response.status);continue}
      return {status:response.status,text,headers:response.headers};
    }catch(error){last=error;if(attempt===1)throw error}
  }
  throw last||new Error('request_failed');
}

for(const item of targets){
  const root=new URL(item.base+'/');
  const page=await get(new URL(item.html,root));
  assert.equal(page.status,200,item.base+' survey page');
  assert.ok(page.text.includes('소상공인 AI 맞춤형 교육 수요조사'),item.base+' title');
  assert.ok(page.text.includes('id="survey"'),item.base+' form');
  assert.ok(page.text.includes('id="noticeOptIn"'),item.base+' optional contact');
  assert.ok(page.text.includes('src="./app.js"'),item.base+' route identity');

  const js=await get(new URL(item.script+'?read_only_health=ranked-v3',root));
  assert.equal(js.status,200,item.base+' survey JS');
  assert.ok(js.text.includes('rankTopicSelection(topicRank,input.value,input.checked)'),item.base+' rank state');
  assert.ok(js.text.includes('const questions = ['),item.base+' gateway identity');

  const schema=await get(new URL(item.schema+'?read_only_health=ranked-v3',root));
  assert.equal(schema.status,200,item.base+' survey schema');
  assert.ok(schema.text.includes('SURVEY_VERSION = 3'),item.base+' schema version');
  assert.ok(schema.text.includes('respondent_type'),item.base+' respondent type');
  assert.ok(schema.text.includes("key:'topics'"),item.base+' merged rank question');
  assert.ok(!schema.text.includes("{key:'priority'"),item.base+' no redundant seventh question');

  const stats=await get(new URL(item.stats,root));
  assert.equal(stats.status,401,item.base+' administrator stats must require login');
  assert.ok(stats.text.includes('login_required'),item.base+' explicit auth denial');

  const contacts=await get(new URL(item.stats+'?contacts=1',root));
  assert.equal(contacts.status,401,item.base+' contact list must require login');

  const responses=await get(new URL(item.responses,root));
  assert.equal(responses.status,405,item.base+' no GET on write-only survey API');
  console.log('PASS read-only survey route, schema, ranking, admin auth and POST-only API:',root.origin);
}
console.log('No production survey data was created, changed, or deleted.');
