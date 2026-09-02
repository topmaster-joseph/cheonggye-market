(()=>{
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const labels={essential:'바로가기',festival:'골목축제',support:'상권 관련 지원사업',revitalization:'상권활성화 지원사업',urban:'도시재생 특화사업',communication:'소통채널'};
  const id=new URLSearchParams(location.search).get('id')||'';
  const $=name=>document.getElementById(name);
  $('resourceBack').href=route('/#resources');$('resourceHome').href=route('/');
  if(id==='member-registration'){location.replace(route('/member'));return}
  if(id==='merchant-list-2024'){location.replace(route('/#registered-market'));return}

  function renderText(text){
    const lines=String(text||'').replace(/\r/g,'').split('\n');
    let html='',list=[];
    const flush=()=>{if(!list.length)return;html+=`<ul>${list.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;list=[]};
    for(const raw of lines){const line=raw.trim();if(!line){flush();continue}if(line.startsWith('### ')){flush();html+=`<h3>${esc(line.slice(4))}</h3>`;continue}if(line.startsWith('## ')){flush();html+=`<h2>${esc(line.slice(3))}</h2>`;continue}if(line.startsWith('# ')){flush();continue}if(/^[-•]\s+/.test(line)){list.push(line.replace(/^[-•]\s+/,''));continue}flush();html+=`<p>${esc(line)}</p>`}flush();return html;
  }
  function youtubeId(url){try{const u=new URL(url);if(u.hostname==='youtu.be')return u.pathname.slice(1);if(u.pathname.startsWith('/live/'))return u.pathname.split('/')[2];return u.searchParams.get('v')||''}catch{return ''}}
  function externalAction(item){
    if(!item.public_url||item.kind==='video')return '';
    const label=item.section==='communication'?'공식 소통창구 열기':'공식 원문 확인';
    return `<a class="primary" href="${esc(item.public_url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
  }
  function petitionForm(){return `<section class="petition-box"><div><span>ONLINE AGREEMENT</span><h2>공영주차장 건설 동의 참여</h2><p>성명, 동의 구분, 면단위 거주지역만 입력합니다. 접수 정보는 주차장 건설 촉구 의견 취합 목적으로 사용합니다.</p></div><form id="parkingPetitionForm" class="petition-form"><label>동의자 성명<input name="signer_name" required minlength="2" maxlength="40" autocomplete="name"></label><label>동의 구분<input name="signer_division" required maxlength="60" placeholder="예: 상인"></label><label>면단위 거주지역<input name="residential_area" required maxlength="80" placeholder="예: 청계면"></label><label class="petition-consent"><input name="consent" type="checkbox" required> 위 의견의 취지에 동의하며 제출 정보의 수집·이용에 동의합니다.</label><label class="petition-hp" aria-hidden="true">웹사이트<input name="website" tabindex="-1" autocomplete="off"></label><button type="submit">동의 제출</button><p id="parkingPetitionStatus" role="status"></p></form></section>`}
  function setupParkingPetition(){
    const form=$('parkingPetitionForm');if(!form)return;
    form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button'),status=$('parkingPetitionStatus'),data=new FormData(form);button.disabled=true;status.textContent='접수 중입니다.';try{const response=await fetch(route('/api/parking-petition'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({signer_name:data.get('signer_name'),signer_division:data.get('signer_division'),residential_area:data.get('residential_area'),website:data.get('website'),consent:data.get('consent')==='on'})});const result=await response.json();if(!response.ok)throw new Error(result.error||'submit_failed');form.reset();status.textContent='동의가 접수되었습니다. 참여해 주셔서 감사합니다.'}catch(error){console.error(error);status.textContent='접수하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.'}finally{button.disabled=false}});
  }
  function renderItem(item){
    document.title=`${item.title} | 청계면상인회`;
    $('resourceSection').textContent=labels[item.section]||'자료실';
    $('resourceTitle').textContent=item.title;
    $('resourceNote').textContent=item.note||'';
    $('resourceActions').innerHTML=externalAction(item);
    let html='';
    if(item.kind==='video'&&item.public_url){const yid=youtubeId(item.public_url);if(yid)html+=`<div class="resource-video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(yid)}" title="${esc(item.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`}
    html+=renderText(item.body);
    if(item.id==='parking-petition')html+=petitionForm();
    if(!html)html='<div class="resource-empty">공개할 내용을 정리하고 있습니다.</div>';
    $('resourceContent').innerHTML=html;
    if(item.id==='parking-petition')setupParkingPetition();
  }
  async function related(item){
    try{const response=await fetch(route('/api/resources'));if(!response.ok)return;const data=await response.json();const list=(data.items||[]).filter(x=>x.section===item.section&&x.id!==item.id).slice(0,4);if(!list.length)return;$('resourceRelatedList').innerHTML=list.map(x=>`<a href="${esc(x.id==='member-registration'?route('/member'):route(`/resource?id=${encodeURIComponent(x.id)}`))}"><span>${esc(x.title)}</span><small>→</small></a>`).join('');$('resourceRelated').hidden=false}catch{}
  }
  async function load(){
    if(!id){$('resourceTitle').textContent='자료를 찾을 수 없습니다';$('resourceContent').innerHTML='<div class="resource-empty">자료실에서 다시 선택해 주세요.</div>';return}
    try{
      const response=await fetch(route(`/api/resources?id=${encodeURIComponent(id)}`));
      const data=await response.json();if(!response.ok)throw new Error(data.error||'resource');
      renderItem(data.item);related(data.item);
    }catch(error){console.error(error);$('resourceTitle').textContent='자료를 찾을 수 없습니다';$('resourceNote').textContent='';$('resourceContent').innerHTML='<div class="resource-empty">자료가 이동되었거나 공개 상태가 변경되었습니다.</div>'}
  }
  load();
})();
