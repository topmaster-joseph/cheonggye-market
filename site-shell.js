(() => {
  const cgmaPrefix=location.hostname==='ekodi.kr'&&(location.pathname==='/cgma'||location.pathname.startsWith('/cgma/'))?'/cgma':'';
  const internal=path=>`${cgmaPrefix}${path}`||'/';
  const homePath=location.pathname==='/'||/\/cgma\/?$/.test(location.pathname);
  if(homePath){
    const apiPath=internal('/api/site-mode');
    const fallbackSetting={mode:'maintenance',title:'홈페이지 업데이트 중입니다',message:'청계면상인회 홈페이지를 더 편리하고 안정적으로 개선하고 있습니다. 업데이트가 완료되면 다시 공개하겠습니다.'};
    document.documentElement.classList.add('cgma-presentation-pending');
    const params=new URLSearchParams(location.search),previewRequested=params.get('admin-preview')==='1';
    const previewToken=previewRequested?sessionStorage.getItem('cgma_admin_preview_token')||'':'';
    const style=document.createElement('style');
    style.textContent='.cgma-site-presentation{min-height:100vh;display:grid;place-items:center;padding:28px;background:radial-gradient(circle at top,#f5f0e5,#dfe9e3);color:#143f35;text-align:center}.cgma-site-presentation .box{max-width:680px;padding:56px 34px;border:1px solid rgba(20,63,53,.16);border-radius:32px;background:rgba(255,255,255,.86);box-shadow:0 24px 80px rgba(20,63,53,.12)}.cgma-site-presentation .mark{width:64px;height:64px;margin:0 auto 20px;border-radius:50%;display:grid;place-items:center;background:#143f35;color:#d7f04a;font-size:28px;font-weight:900}.cgma-site-presentation small{font-weight:800;letter-spacing:.16em}.cgma-site-presentation h1{font-size:clamp(2.2rem,7vw,4.8rem);margin:.4em 0 .25em}.cgma-site-presentation p{font-size:1.05rem;line-height:1.8;color:#53625d;white-space:pre-line}.cgma-site-presentation .actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:26px}.cgma-site-presentation a,.cgma-site-presentation button{border:0;border-radius:999px;padding:.8rem 1.1rem;background:#143f35;color:#fff;font:inherit;font-weight:800;text-decoration:none;cursor:pointer}html.cgma-presentation-active body>*:not(.cgma-site-presentation):not(script){display:none!important}.cgma-admin-preview-bar{position:fixed;z-index:99999;left:50%;top:10px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:999px;background:#143f35;color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.18);font:700 12px/1.3 system-ui}.cgma-admin-preview-bar b{color:#d7f04a}.cgma-admin-preview-bar a{color:#fff;text-decoration:underline}html.cgma-presentation-pending body>*{visibility:hidden!important}';
    document.head.appendChild(style);
    const contactHref=()=>{const url=new URL('https://ekodi.kr/mail/contact');url.searchParams.set('source','cgma');url.searchParams.set('site','청계면상인회');url.searchParams.set('source_url',location.href);return url.href};
    const showPresentation=setting=>{const overlay=document.createElement('main');overlay.className='cgma-site-presentation';overlay.innerHTML='<div class="box"><div class="mark">청</div><small></small><h1></h1><p></p><div class="actions"><a href="'+contactHref()+'">문의하기</a></div></div>';overlay.querySelector('small').textContent=setting.mode==='maintenance'?'SITE UPDATE':'NOTICE';overlay.querySelector('h1').textContent=setting.title||'잠시 공사중입니다';overlay.querySelector('p').textContent=setting.message||'더 나은 홈페이지를 준비하고 있습니다.';if(setting.mode==='notice'){const button=document.createElement('button');button.type='button';button.textContent='홈페이지 보기';button.onclick=()=>{overlay.remove();document.documentElement.classList.remove('cgma-presentation-active')};overlay.querySelector('.actions').prepend(button)}document.documentElement.classList.remove('cgma-presentation-pending');document.body.prepend(overlay);document.documentElement.classList.add('cgma-presentation-active')};
    const showAdminPreview=()=>{document.documentElement.classList.remove('cgma-presentation-pending');const bar=document.createElement('div');bar.className='cgma-admin-preview-bar';bar.innerHTML='<b>관리자 미리보기</b><span>공개 홈페이지는 일시 중지 상태입니다.</span><a href="'+internal('/admin/')+'">관리자로 돌아가기</a>';document.body.prepend(bar)};
    const verifyPreview=previewRequested&&previewToken?fetch(internal('/api/admin-session'),{headers:{Authorization:'Bearer '+previewToken},cache:'no-store'}).then(r=>r.ok).catch(()=>false):Promise.resolve(false);
    Promise.all([fetch(apiPath,{cache:'no-store'}).then(r=>r.ok?r.json():{setting:fallbackSetting}).catch(()=>({setting:fallbackSetting})),verifyPreview]).then(([data,previewAllowed])=>{const setting=data?.setting;if(!setting||setting.mode==='normal'){document.documentElement.classList.remove('cgma-presentation-pending');return;}if(previewAllowed){showAdminPreview();return}if(previewRequested)sessionStorage.removeItem('cgma_admin_preview_token');showPresentation(setting)}).catch(error=>{console.warn('CGMA presentation mode',error);showPresentation(fallbackSetting)});
  }

  const footerMarkup = `
    <div class="ekodi-footer-brand">
      <span class="ekodi-footer-mark" aria-hidden="true">청</span>
      <div><strong>청계면상인회</strong><small>CHEONGGYE MERCHANTS</small></div>
    </div>
    <div class="ekodi-footer-context">
      <strong>목포대 후문과 청계면을 잇는 생활상권</strong>
      <p>전라남도 무안군 청계면 · 목포대 후문 상권</p>
      <p><a href="mailto:cgma4989@gmail.com">cgma4989@gmail.com</a> · <a href="tel:01035018542">010-3501-8542</a> · <a href="${internal('/admin')}">관리자 운영관리</a></p>
    </div>
    <div class="ekodi-footer-ekodi"><span>EKODI</span><p>사람과 지역을 잇는 연결형 플랫폼</p></div>
    <p class="ekodi-footer-copy">© 2026 청계면상인회. All rights reserved.</p>`;
  document.querySelectorAll('[data-ekodi-footer]').forEach((footer) => {
    footer.classList.add('ekodi-common-footer');
    footer.innerHTML = footerMarkup;
  });
  const style = document.createElement('style');
  style.textContent = `
    .ekodi-common-footer{background:#0d2f28!important;color:#fff!important;padding:44px max(24px,7vw) 24px!important;display:grid!important;grid-template-columns:1.05fr 1.45fr .8fr!important;gap:32px!important;align-items:start!important}
    .ekodi-footer-brand{display:flex;align-items:center;gap:12px}.ekodi-footer-mark{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#d7f04a;color:#143f35;font-weight:900}
    .ekodi-footer-brand strong{display:block}.ekodi-footer-brand small{display:block;margin-top:2px;font-size:9px;letter-spacing:.13em;color:#9cb2ab}
    .ekodi-footer-context strong{font-size:14px}.ekodi-common-footer p{margin:6px 0!important;color:#a9bcb6!important;font-size:12px!important}.ekodi-common-footer a{color:inherit!important}
    .ekodi-footer-ekodi{text-align:right}.ekodi-footer-ekodi span{font-weight:900;letter-spacing:.16em;color:#d7f04a}.ekodi-footer-copy{grid-column:1/-1;border-top:1px solid #315149;padding-top:16px;margin-top:8px!important}
    @media(max-width:760px){.ekodi-common-footer{grid-template-columns:1fr!important;gap:22px!important}.ekodi-footer-ekodi{text-align:left}.ekodi-footer-copy{grid-column:1!important}}
    .language-picker{display:inline-flex;align-items:center;gap:5px;border:1px solid rgba(20,63,53,.28);border-radius:999px;padding:5px 8px;background:rgba(255,255,255,.35)}
    .language-picker select{max-width:94px;border:0;background:transparent;color:#143f35;font:inherit;font-size:.78rem;font-weight:700;outline:0;cursor:pointer}`;
  document.head.appendChild(style);
})();
