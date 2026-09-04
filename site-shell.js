(() => {
  const footerMarkup = `
    <div class="ekodi-footer-brand">
      <span class="ekodi-footer-mark" aria-hidden="true">청</span>
      <div><strong>청계면상인회</strong><small>CHEONGGYE MERCHANTS</small></div>
    </div>
    <div class="ekodi-footer-context">
      <strong>목포대 후문과 청계면을 잇는 생활상권</strong>
      <p>전라남도 무안군 청계면 · 목포대 후문 상권</p>
      <p><a href="mailto:cgma4989@gmail.com">cgma4989@gmail.com</a> · <a href="tel:01035018542">010-3501-8542</a></p>
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
  const language=document.getElementById('siteLanguage');
  if(language){
    const key='ekodi-language',supported=['en','zh-CN','ja','vi','ne'];
    const saved=localStorage.getItem(key)||'ko';language.value=saved;
    const setCookie=(value,days=365)=>{const age=days*86400;document.cookie=`googtrans=${value};path=/;max-age=${age};SameSite=Lax`;document.cookie=`googtrans=${value};path=/;domain=.${location.hostname};max-age=${age};SameSite=Lax`;};
    const clearCookie=()=>{document.cookie='googtrans=;path=/;max-age=0';document.cookie=`googtrans=;path=/;domain=.${location.hostname};max-age=0`;};
    const apply=(target,tries=0)=>{const combo=document.querySelector('.goog-te-combo');if(!combo){if(tries<80)setTimeout(()=>apply(target,tries+1),100);return;}combo.value=target;combo.dispatchEvent(new Event('change',{bubbles:true}));};
    window.ekodiGoogleTranslateInit=()=>{new google.translate.TranslateElement({pageLanguage:'ko',includedLanguages:supported.join(','),autoDisplay:false},'google_translate_element');if(saved!=='ko')apply(saved);};
    const mount=document.createElement('div');mount.id='google_translate_element';mount.hidden=true;document.body.appendChild(mount);
    if(saved!=='ko')setCookie(`/ko/${saved}`);
    const gt=document.createElement('script');gt.src='https://translate.google.com/translate_a/element.js?cb=ekodiGoogleTranslateInit';gt.async=true;document.head.appendChild(gt);
    language.addEventListener('change',()=>{const target=language.value;localStorage.setItem(key,target);if(target==='ko'){clearCookie();location.reload();return;}setCookie(`/ko/${target}`);apply(target);});
  }
})();
