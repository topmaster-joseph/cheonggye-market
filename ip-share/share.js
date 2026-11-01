(()=>{
'use strict';
const status=document.getElementById('status'),content=document.getElementById('content'),files=document.getElementById('files');
const token=new URL(location.href).searchParams.get('token');
if(!token||!/^[A-Za-z0-9_-]{43}$/.test(token)){status.textContent='유효하지 않거나 종료된 자료 공유입니다.';return}
const path=window.CGMA_ROUTE?.route('/api/ip-share')||'/api/ip-share';
fetch(path+'?token='+encodeURIComponent(token),{cache:'no-store',credentials:'omit'})
.then(async res=>{const data=await res.json();if(!res.ok||data.ok!==true)throw Error('unavailable');return data})
.then(data=>{
  status.textContent=data.documents.length+'건의 공유 자료가 확인되었습니다.';
  document.getElementById('expire').textContent='링크 만료 일시: '+data.expires_at+' (한국시간이 아닌 서버 UTC 기준)';
  document.getElementById('purpose').textContent='공유 목적: '+data.purpose;
  document.getElementById('warning').textContent=data.warning;
  files.replaceChildren();
  for(const item of data.documents){
    if(!/^https:\/\/drive\.google\.com\/(file\/d\/|drive\/folders\/)/.test(item.url))continue;
    const card=document.createElement('article');
    const h=document.createElement('h2');h.textContent=item.title;
    const p=document.createElement('p');p.textContent=item.note;
    const a=document.createElement('a');a.textContent='Google Drive 자료 열기 ↗';a.href=item.url;
    a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';
    card.append(h,p,a);files.append(card);
  }
  content.hidden=false;
})
.catch(()=>{status.textContent='유효하지 않거나 만료·회수된 자료 공유입니다. 관리자에게 새 링크를 요청해 주세요.';content.hidden=true;});
})();
