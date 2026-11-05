(()=>{'use strict';
const P=window.CGMA_PROGRAMS;
const $=id=>document.getElementById(id);
const form=$('application'),button=$('submit'),status=$('status');
const digits=value=>String(value||'').replace(/\D/g,'');
const phoneInput=$('phone');
phoneInput.addEventListener('input',()=>{
  const v=digits(phoneInput.value).slice(0,11);
  phoneInput.value=v.length>7?v.slice(0,3)+'-'+v.slice(3,-4)+'-'+v.slice(-4):v;
});
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const store_name=$('store').value.trim();
  const name=$('name').value.trim();
  const phone=digits(phoneInput.value);
  status.hidden=false;
  if(store_name.length<2||name.length<2||!/^01[016789]\d{7,8}$/.test(phone)){
    status.textContent='상호·성명(각 2자 이상)과 연락처를 정확히 입력해 주세요.';return;
  }
  if(!$('privacy').checked){status.textContent='개인정보 수집·이용에 동의해 주세요.';return}
  if($('website').value.trim()){status.textContent='신청을 처리하지 못했습니다.';return}
  if(!P){status.textContent='서버 연결을 준비하지 못했습니다. 다시 접속해 주세요.';return}
  button.disabled=true;status.textContent='접수 결과를 확인하는 중입니다.';
  try{
    const reply=await P.rpc('cgma_mnu_2026_apply',{
      p_store_name:store_name,p_name:name,p_phone:phone,p_privacy_ack:true
    });
    if(!reply?.ok){
      status.textContent={
        duplicate:'이미 등록된 성명과 연락처입니다. 변경이 필요하면 상인회에 문의해 주세요.',
        closed:'11월 10일 모집 기간이 종료되었습니다.',
        invalid:'입력값을 다시 확인해 주세요.',
        consent_required:'개인정보 수집·이용 동의가 필요합니다.'
      }[reply?.error]||'신청이 저장되지 않았습니다. 다시 시도해 주세요.';
      return;
    }
    status.hidden=true;form.hidden=true;$('done').hidden=false;$('done').focus();
  }catch{
    status.textContent='접수 서버에 연결하지 못했습니다. 저장 여부를 확인할 수 없어 다시 확인해 주세요.';
  }finally{button.disabled=false}
});
$('again').addEventListener('click',()=>{form.reset();form.hidden=false;$('done').hidden=true;status.hidden=true;$('store').focus()});
})();
