(()=>{
'use strict';
const route=value=>window.CGMA_ROUTE?.route(value)||value;
const $=id=>document.getElementById(id);
const form=$('ipShareForm'),items=$('ipShareChoices'),status=$('ipShareStatus'),result=$('ipShareResult'),history=$('ipShareHistory');
if(!form||!items||!status||!result||!history)return;
let token='',documents=[];
function statusText(message,error=false){status.textContent=message;status.dataset.state=error?'error':'ready'}
function el(tag,text,cls){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x}
function button(label,cb){const b=el('button',label);b.type='button';b.addEventListener('click',cb);return b}
const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+token});
const url='/api/ip-shares';
const errors={
  recipient_email_invalid:'수신자 이메일 주소를 확인해 주세요.',
  documents_invalid:'공유할 자료를 선택해 주세요.',
  expiration_invalid:'유효기간을 확인해 주세요.',
  purpose_invalid:'공유 목적은 2~240자로 작성해 주세요.',
  acknowledgement_required:'공유 및 구글 드라이브 권한 안내에 동의해 주세요.',
  original_rights_confirmation_required:'디자인 원본의 저작권 확인과 별도 사용허락 필요성을 승인해 주세요.',
  daily_share_limit:'하루 초대 생성 횟수 제한에 도달했습니다.',
  archive_database_unavailable:'자료실 기록 저장소에 연결할 수 없습니다.'
};
async function api(path,options={}){
  const res=await fetch(route(path),{method:options.method||'GET',cache:'no-store',credentials:'omit',headers:headers(),body:options.body?JSON.stringify(options.body):undefined});
  let data;try{data=await res.json()}catch{data={error:'invalid_response'}}
  if(!res.ok||!data.ok)throw new Error(errors[data.error]||'요청이 처리되지 않았습니다. ('+res.status+')');
  return data;
}
function showDocuments(list){
  documents=list.filter(item=>item.id!=='cgma-ip-archive-folder');
  items.replaceChildren();
  for(const item of documents){
    const line=el('label',undefined,'cgma-ip-share-choice');
    const box=document.createElement('input');box.type='checkbox';box.name='shared_document';box.value=item.id;
    line.append(box,el('span',item.title));items.append(line);
  }
}
async function refreshHistory(){
  const data=await api(url);
  history.replaceChildren();
  if(!data.items.length){history.append(el('p','아직 발급한 초대 링크가 없습니다.'));return}
  const now=Date.now();
  for(const item of data.items){
    const section=el('article',undefined,'cgma-ip-share-history-item');
    const expiration=Date.parse(item.expires_at.replace(' ','T')+'Z');
    const active=!item.revoked_at&&expiration>now;
    section.append(el('strong',item.recipient_email));
    section.append(el('p',item.purpose));
    section.append(el('small',item.document_ids.length+'건 · 만료 '+item.expires_at+' UTC · '+(item.revoked_at?'회수됨':active?'링크 유효':'만료됨')));
    if(active){
      section.append(button('초대 링크 회수',async()=>{
        if(!window.confirm('이 초대 링크를 회수할까요? Google Drive에서 이미 부여한 열람권한은 별도로 철회해야 합니다.'))return;
        try{await api(url+'?id='+encodeURIComponent(item.id),{method:'DELETE'});statusText('초대 링크를 회수했습니다. Google Drive 권한은 별도 철회해 주세요.');await refreshHistory()}catch(e){statusText(e.message,true)}
      }));
    }
    history.append(section);
  }
}
function showResult(data){
  result.hidden=false;result.replaceChildren();
  result.append(el('strong','초대 링크 생성 완료 — Google Drive 읽기 권한은 별도 설정 필요'));
  const field=document.createElement('input');field.readOnly=true;field.value=data.share_url;field.type='text';field.setAttribute('aria-label','외부 공유 초대 링크');result.append(field);
  result.append(button('초대 링크 복사',async()=>{try{await navigator.clipboard.writeText(data.share_url);statusText('링크를 복사했습니다.')}catch{field.select();statusText('직접 링크를 복사해 주세요.',true)}}));
  const subject='[청계면상인회] 제한 자료 열람 안내';
  const body='안녕하세요. 청계면상인회 자료의 제한 열람 안내입니다.\n\n'+data.share_url+'\n\n링크 만료: '+data.expires_at+' (UTC)\nGoogle Drive 파일을 열려면 별도 열람권한이 필요합니다.\n자료의 무단 재배포·상업적 사용은 허용되지 않습니다.';
  const mail=el('a','이메일 초대 작성 ↗');mail.href='mailto:'+encodeURIComponent(data.recipient_email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);result.append(mail);
  result.append(el('p','권한 설정: 아래 각 자료를 Google Drive로 열어 수신자 이메일에 "뷰어" 권한을 부여하세요. 공유 링크의 만료·회수만으로 Google Drive 권한이 자동 철회되지는 않습니다.'));
  for(const id of data.document_ids){
    const doc=documents.find(d=>d.id===id);if(!doc)continue;
    const a=el('a','Google Drive 권한 설정 — '+doc.title+' ↗');a.href=doc.url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';result.append(a);
  }
}
async function start(session){
  token=session?.access_token||'';
  if(!token){statusText('관리자 로그인 후 공유 기능을 사용할 수 있습니다.',true);return}
  try{
    const archive=await api('/api/ip-archive');
    showDocuments(archive.documents);
    await refreshHistory();
    statusText('수신자·공유 자료·유효기간을 지정해 링크를 발급할 수 있습니다.');
  }catch(error){statusText('공유 관리 기능을 불러오지 못했습니다. '+error.message,true);form.hidden=true}
}
form.addEventListener('submit',async event=>{
  event.preventDefault();result.hidden=true;
  const docs=[...form.querySelectorAll('input[name="shared_document"]:checked')].map(x=>x.value);
  const req={
    recipient_email:form.elements.recipient_email.value,
    document_ids:docs,
    purpose:form.elements.purpose.value,
    expires_in_days:Number(form.elements.expires_in_days.value),
    confirm_limited_access:form.elements.confirm_limited_access.checked,
    confirm_original_rights:form.elements.confirm_original_rights.checked
  };
  const submit=form.querySelector('button[type="submit"]');submit.disabled=true;statusText('제한 공유 링크를 발급하고 있습니다.');
  try{
    const data=await api(url,{method:'POST',body:req});
    showResult(data);await refreshHistory();
    statusText('초대 링크가 발급되었습니다. 이메일 전송과 Google Drive 뷰어 권한 설정은 관리자가 수행해야 합니다.');
  }catch(error){statusText(error.message,true)}
  finally{submit.disabled=false}
});
window.CGMA_IP_SHARING={start};
})();
