'use strict';
const state=document.getElementById('state'),chart=document.getElementById('charts');
const qs=new URL(location.href).searchParams,token=qs.get('token');
if(location.hostname==='cheonggye-market.pages.dev')document.querySelector('a[href="/cgma/ai-education/"]').href='/ai-education/';
const text=(tag,str,cls='')=>{const el=document.createElement(tag);el.textContent=str;if(cls)el.className=cls;return el};
async function load(){
  if(!/^[a-f0-9]{64}$/.test(token||'')){state.textContent='유효한 공유 링크가 아닙니다.';return}
  try{
    const endpoint=location.hostname==='cheonggye-market.pages.dev'?'/api/ai-education-share':'../api/share';
    const response=await fetch(endpoint+'?token='+encodeURIComponent(token),{cache:'no-store',referrerPolicy:'no-referrer'});
    const stats=await response.json().catch(()=>({}));
    if(!response.ok||stats.shared!==true)throw Error('공유 링크가 만료되었거나 비활성화되었습니다.');
    document.getElementById('report').hidden=false;
    document.getElementById('total').textContent='총 응답 '+stats.total.toLocaleString('ko-KR')+'건';
    document.getElementById('updated').textContent=stats.calculated_at?'집계 기준 '+new Date(stats.calculated_at).toLocaleString('ko-KR'):'';
    if(stats.suppressed){state.textContent='집계된 응답이 5건 미만으로 세부 통계를 공개하지 않습니다.';return}
    state.textContent='개인정보 없이 합산한 선택형 통계입니다. 복수 선택 문항의 비율 합계는 100%를 넘을 수 있습니다.';
    for(const section of stats.sections){
      const block=text('section','');block.className='report-section';block.append(text('h2',section.title));
      for(const item of section.options){
        const line=text('div','');line.className='line';
        line.append(text('span',item.answer),text('strong',item.count+'건 · '+item.percent+'%'));
        const track=text('div','');track.className='track';
        const fill=text('div','');fill.className='fill';fill.style.width=Math.min(100,Math.max(0,item.percent))+'%';
        track.append(fill);block.append(line,track);
      }
      chart.append(block);
    }
  }catch(e){state.textContent=e.message||'통계를 불러올 수 없습니다.'}
}
load();