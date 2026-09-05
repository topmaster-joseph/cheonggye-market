(()=>{
  const route=value=>window.CGMA_ROUTE?.route(value)||value;
  const $=id=>document.getElementById(id);
  const presets={
    normal:{title:'',message:''},
    maintenance:{title:'잠시 공사중입니다',message:'청계면상인회 홈페이지를 더 편리하게 준비하고 있습니다. 잠시 후 다시 찾아주세요.'},
    notice:{title:'청계면상인회 안내',message:'현재 꼭 필요한 안내사항을 먼저 전해드립니다.'}
  };
  let token='';
  const status=(text,error=false)=>{const el=$('siteModeStatus');if(!el)return;el.textContent=text||'';el.className=`admin-resource-status${error?' error':''}`};
  function preview(){
    const form=$('siteModeForm');if(!form)return;
    const mode=form.elements.mode.value,preset=presets[mode]||presets.normal;
    $('siteModePreviewLabel').textContent=mode==='normal'?'정상 홈페이지':mode==='maintenance'?'공사중 화면':'안내 첫화면';
    $('siteModePreviewTitle').textContent=String(form.elements.title.value||preset.title||'정상 홈페이지');
    $('siteModePreviewMessage').textContent=String(form.elements.message.value||preset.message||'현재 홈페이지 전체 콘텐츠가 공개됩니다.');
  }
  function apply(setting){
    const form=$('siteModeForm');if(!form)return;
    const mode=['normal','maintenance','notice'].includes(setting?.mode)?setting.mode:'normal';
    form.elements.mode.value=mode;form.elements.title.value=setting?.title||presets[mode].title;
    form.elements.message.value=setting?.message||presets[mode].message;preview();
  }
  async function load(){
    status('현재 첫화면 설정을 불러오는 중입니다.');
    try{
      const response=await fetch(route('/api/site-mode'),{cache:'no-store'}),data=await response.json();
      if(!response.ok)throw new Error(data.error||'site_mode_load_failed');
      apply(data.setting);
      status(data.degraded?'저장소를 확인하지 못해 정상 홈페이지로 표시 중입니다.':'현재 첫화면 설정을 불러왔습니다.',Boolean(data.degraded));
    }catch(error){console.error(error);status('첫화면 설정을 불러오지 못했습니다.',true)}
  }
  async function save(event){
    event.preventDefault();const form=event.currentTarget;status('첫화면 설정을 적용하고 있습니다.');
    try{
      const response=await fetch(route('/api/site-mode'),{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({mode:form.elements.mode.value,title:form.elements.title.value,message:form.elements.message.value})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||'site_mode_save_failed');
      apply(data.setting);status('첫화면 설정을 적용했습니다. 공개 화면에 반영됩니다.');
    }catch(error){console.error(error);status('첫화면 설정을 저장하지 못했습니다.',true)}
  }
  function start(session){
    token=session?.access_token||'';if(!token)return;$('siteModeManager').hidden=false;
    const form=$('siteModeForm');form?.addEventListener('submit',save);
    form?.elements.mode?.addEventListener('change',()=>{const mode=form.elements.mode.value,preset=presets[mode];if(mode!=='normal'){form.elements.title.value=preset.title;form.elements.message.value=preset.message}preview()});
    form?.elements.title?.addEventListener('input',preview);form?.elements.message?.addEventListener('input',preview);load();
  }
  window.CGMA_SITE_MODE_ADMIN={start};
})();
