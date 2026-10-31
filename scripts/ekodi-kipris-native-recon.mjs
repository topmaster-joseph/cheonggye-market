// EKODI-owned isolated Chromium for public KIPRIS trademark reconnaissance.
// Read-only KIPRIS search UI; no login, credentials, application or payment.
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';

const TARGET='https://www.kipris.or.kr/khome/search/searchResult.do?tab=trademark';
const ROOT='artifacts/kipris-native';
await mkdir(ROOT,{recursive:true});
const result={executedAt:new Date().toISOString(),executor:'EKODI-owned GitHub Actions native Chromium',target:TARGET,query:'청깨비',verified:false,notes:[],inputs:[],buttons:[],evidence:null};
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1440,height:900},locale:'ko-KR',acceptDownloads:false});
const page=await ctx.newPage();
const forbidden=[];
try{
  await page.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url()),method=req.method().toUpperCase();
    // Permit normal page navigation. KIPRIS search POST is only a read-only search on its exact path.
    const kiprisSearch=u.hostname==='www.kipris.or.kr'&&u.pathname.startsWith('/khome/search/');
    if(!['GET','HEAD','OPTIONS'].includes(method)&&!(method==='POST'&&kiprisSearch)){
      forbidden.push({method,host:u.hostname,path:u.pathname});
      await route.abort('blockedbyclient');return;
    }
    await route.continue();
  });
  const response=await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForTimeout(3500);
  result.http=response?.status()??null;
  result.url=page.url();
  result.title=await page.title();
  result.bodyStart=(await page.locator('body').innerText().catch(()=>'' )).slice(0,1600);
  result.inputs=await page.locator('input').evaluateAll(inputs=>inputs.filter(x=>{const b=x.getBoundingClientRect();return b.width>0&&b.height>0}).slice(0,65).map(x=>({id:x.id,name:x.name,placeholder:x.placeholder,aria:x.getAttribute('aria-label'),type:x.type,outer:x.outerHTML.slice(0,260)})));
  result.buttons=await page.locator('button').evaluateAll(buttons=>buttons.filter(x=>{const b=x.getBoundingClientRect();return b.width>0&&b.height>0}).slice(0,45).map(x=>({id:x.id,text:(x.innerText||x.getAttribute('aria-label')||'').trim().slice(0,70),outer:x.outerHTML.slice(0,220)})));
  await page.screenshot({path:ROOT+'/trademark-screen.png',fullPage:false});
  // Submit one explicitly requested public trademark-name search.
  // KIPRIS uses a dedicated trademark search field (TN), not a generic all-rights search.
  try{
    const field=page.locator('#sd010301_g05_text');
    const detail=page.locator('#btnOpenSearchDetail');
    // KIPRIS may render its advanced-search modal open by default. Clicking a covered
    // "상세검색" toggle would be intercepted by that overlay, so only open when required.
    if(!(await field.isVisible()) && await detail.isVisible())await detail.click({timeout:7000});
    await field.waitFor({state:'visible',timeout:12000});
    await field.fill('청깨비');
    const exact=page.locator('#ktmExactMatch');
    if(await exact.count())await exact.check({force:true});
    result.searchField='TN';
    result.exactMatch=true;
    const searchButton=page.getByRole('button',{name:'검색하기',exact:true}).last();
    result.matchingSearchButtons=await page.getByRole('button',{name:'검색하기',exact:true}).count();
    await searchButton.click({timeout:12000});
    await page.waitForTimeout(5500);
    result.searchUrl=page.url();
    result.searchTitle=await page.title();
    result.searchVisibleText=(await page.locator('body').innerText()).slice(0,13500);
    await page.screenshot({path:ROOT+'/cheongkkaebi-search.png',fullPage:false});
    result.notes.push('TN field query submitted. Search result content captured separately, not auto-certified.');
    // Additional bounded public TN lookups. Treat results independently; a text zero does not clear similarity risk.
    result.additionalQueries=[];
    for(const term of ['청개비','목깨비','청계거리']){
      await page.waitForTimeout(2200);
      await page.goto(TARGET,{waitUntil:'domcontentloaded',timeout:25000});
      await page.waitForTimeout(1100);
      const f=page.locator('#sd010301_g05_text');
      if(!(await f.isVisible()))await page.locator('#btnOpenSearchDetail').click({force:true,timeout:4500});
      await f.fill(term);
      const x=page.locator('#ktmExactMatch');
      if(await x.count() && await x.isChecked())await x.uncheck({force:true});
      await page.getByRole('button',{name:'검색하기',exact:true}).last().click({timeout:10000});
      await page.waitForTimeout(3700);
      const text=(await page.locator('body').innerText());
      const heading=await page.title();
      const hit=text.match(/.{0,90}(?:검색결과가 없습니다|총\\s*[0-9,]+\\s*건|검색결과\\s*[0-9,]+).{0,90}/);
      const item={term,heading,url:page.url(),empty:text.includes('검색결과가 없습니다'),snippet:hit?.[0]||'',bodyTail:text.slice(-4800,-800)};
      result.additionalQueries.push(item);
    }
    await page.screenshot({path:ROOT+'/variants-result.png',fullPage:false});

  }catch(error){
    result.notes.push('TN search interaction could not be verified: '+String(error?.message||error).slice(0,500));
  }

  result.notes.push('Real public page loaded. Selector reconnaissance only: result counts are not asserted without verified query.');
  result.forbiddenRequests=forbidden.length;
}catch(e){
  result.notes.push('Navigation failed: '+String(e?.message||e).slice(0,300));
}finally{
  await writeFile(ROOT+'/recon.json',JSON.stringify(result,null,2));
  console.log('EKODI_KIPRIS_RECON_BEGIN');
  console.log(JSON.stringify(result));
  console.log('EKODI_KIPRIS_RECON_END');
  await ctx.close();await browser.close();
}
