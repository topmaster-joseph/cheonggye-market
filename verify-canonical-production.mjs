const BASE='https://ekodi.kr';
const EVIDENCE_ROUTE='cgma-root-gateway';
const EVIDENCE_UPSTREAM='cheonggye-market-pages';
let failures=0;

function report(ok,label,detail=''){
  if(!ok)failures++;
  console.log(`${ok?'PASS':'FAIL'} ${label}${detail?` ${detail}`:''}`);
}

async function fetchText(path,{marker='',finalPath=''}={}){
  try{
    const response=await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}proof=${Date.now()}`,{redirect:'follow',cache:'no-store'});
    const text=await response.text();
    const route=response.headers.get('x-ekodi-route')||'';
    const upstream=response.headers.get('x-ekodi-cgma-upstream')||'';
    const actualPath=new URL(response.url).pathname;
    const ok=response.status===200&&route===EVIDENCE_ROUTE&&upstream===EVIDENCE_UPSTREAM&&(!marker||text.includes(marker))&&(!finalPath||actualPath===finalPath);
    report(ok,path,`status=${response.status} final=${actualPath} route=${route}`);
    return {response,text,actualPath,ok};
  }catch(error){
    report(false,path,`error=${error.message}`);
    return {response:null,text:'',actualPath:'',ok:false};
  }
}

const root=await fetchText('/cgma',{marker:'청계면상인회 | 오늘도 청계에서 만나요',finalPath:'/cgma/'});
report(root.text.includes('<link rel="canonical" href="https://ekodi.kr/cgma">'),'root canonical link');
report(!root.text.includes('cgma.ekodi.kr'),'root old public domain absent');

const cssHref=root.text.match(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']*styles\.css[^"']*)["']/i)?.[1]||'';
const scriptSrc=root.text.match(/<script[^>]+src=["']([^"']*site-path\.js[^"']*)["']/i)?.[1]||'';
if(root.response&&cssHref){
  const cssUrl=new URL(cssHref,root.response.url),css=await fetch(cssUrl,{cache:'no-store'});
  report(css.status===200&&css.headers.get('x-ekodi-route')===EVIDENCE_ROUTE&&String(css.headers.get('content-type')||'').includes('text/css'),'root stylesheet resolution',`url=${cssUrl.pathname} status=${css.status}`);
}else report(false,'root stylesheet resolution','missing href');
if(root.response&&scriptSrc){
  const jsUrl=new URL(scriptSrc,root.response.url),js=await fetch(jsUrl,{cache:'no-store'}),body=await js.text();
  report(js.status===200&&js.headers.get('x-ekodi-route')===EVIDENCE_ROUTE&&body.includes("prefix='/cgma'"),'root site-path resolution',`url=${jsUrl.pathname} status=${js.status}`);
}else report(false,'root site-path resolution','missing src');
report(root.text.includes('ai-menu-disabled')&&root.text.includes('현재 비활성화'),'Marketing AI menu paused');
await fetchText('/cgma/ai',{marker:'청계상권 Marketing AI | 현재 비활성화',finalPath:'/cgma/market-ai'});
await fetchText('/cgma/member',{marker:'EKODI 통합인증센터',finalPath:'/cgma/member/'});
await fetchText('/cgma/store',{marker:'내 가게 운영 | 청계상권 AI',finalPath:'/cgma/store-admin'});
await fetchText('/cgma/admin',{marker:'ADMIN CONSOLE',finalPath:'/cgma/admin/'});
await fetchText('/cgma/member-admin',{marker:'MEMBERSHIP REVIEW',finalPath:'/cgma/member-admin/'});
await fetchText('/cgma/resource?id=bylaws',{marker:'resource-detail.js',finalPath:'/cgma/resource'});

try{
  const resources=await fetch(`${BASE}/cgma/api/resources?proof=${Date.now()}`,{cache:'no-store'}),data=await resources.json();
  const items=Array.isArray(data.items)?data.items:[],route=resources.headers.get('x-ekodi-route')||'',parking=items.find(item=>item.id==='parking-petition');
  const leaked=/drive\.google\.com|docs\.google\.com/i.test(JSON.stringify(items));
  report(resources.status===200&&route===EVIDENCE_ROUTE&&items.length>=20&&parking&&!parking.public_url&&!leaked,'/cgma/api/resources',`status=${resources.status} items=${items.length} route=${route}`);
}catch(error){report(false,'/cgma/api/resources',`error=${error.message}`)}

try{
  const support=await fetch(`${BASE}/cgma/api/resources?id=support-plan&proof=${Date.now()}`,{cache:'no-store'}),data=await support.json();
  report(support.status===200&&support.headers.get('x-ekodi-route')===EVIDENCE_ROUTE&&String(data.item?.body||'').includes('총사업비는 1억원')&&!data.item?.public_url,'internal support-plan content',`status=${support.status}`);
}catch(error){report(false,'internal support-plan content',`error=${error.message}`)}
try{
  const petition=await fetch(`${BASE}/cgma/api/parking-petition?proof=${Date.now()}`,{cache:'no-store'}),data=await petition.json();
  report(petition.status===200&&petition.headers.get('x-ekodi-route')===EVIDENCE_ROUTE&&Number.isFinite(Number(data.count)),'parking petition endpoint',`status=${petition.status}`);
}catch(error){report(false,'parking petition endpoint',`error=${error.message}`)}
try{
  const privatePetition=await fetch(`${BASE}/cgma/api/parking-petition?include_entries=1&proof=${Date.now()}`,{cache:'no-store'});
  report(privatePetition.status===401&&privatePetition.headers.get('x-ekodi-route')===EVIDENCE_ROUTE,'petition authorization boundary',`unauthenticated=${privatePetition.status} expected=401`);
}catch(error){report(false,'petition authorization boundary',`error=${error.message}`)}
try{
  const auth=await fetch(`${BASE}/cgma/api/admin-session?proof=${Date.now()}`,{cache:'no-store'});
  report(auth.status===401&&auth.headers.get('x-ekodi-route')===EVIDENCE_ROUTE,'admin authorization boundary',`unauthenticated=${auth.status} expected=401`);
}catch(error){report(false,'admin authorization boundary',`error=${error.message}`)}

console.log(`RESULT ${failures===0?'ALL_PASS':`FAILURES=${failures}`}`);
process.exitCode=failures?1:0;
