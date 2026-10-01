(()=>{
  const groups=Object.freeze({
    today:{panels:['controlTower'],metrics:['merchant','regular','pending','notice'],showCommands:true},
    members:{panels:['merchantManager','memberReview'],metrics:['merchant','regular','pending'],showCommands:false},
    content:{panels:['noticeManager','resourceManager','siteModeManager','languageManager'],metrics:['notice','resource'],showCommands:false},
    field:{panels:['petitionManager'],metrics:['petition'],showCommands:false}
  });
  const panelIds=['controlTower','merchantManager','memberReview','noticeManager','resourceManager','siteModeManager','languageManager','petitionManager'];
  const groupForTarget=id=>Object.entries(groups).find(([,cfg])=>cfg.panels.includes(id))?.[0]||(id==='dashboard'?'today':null);
  const setTab=group=>{
    const cfg=groups[group]||groups.today;
    document.documentElement.dataset.cgmaAdminTab=group;
    document.querySelectorAll('[data-admin-tab]').forEach(btn=>{
      const active=btn.dataset.adminTab===group;
      btn.setAttribute('aria-selected',active?'true':'false');
      btn.classList.toggle('is-active',active);
    });
    document.querySelectorAll('[data-admin-metric]').forEach(card=>card.classList.toggle('admin-tab-hidden',!cfg.metrics.includes(card.dataset.adminMetric)));
    panelIds.forEach(id=>document.getElementById(id)?.classList.toggle('admin-tab-hidden',!cfg.panels.includes(id)));
    document.querySelector('.admin-command-grid')?.classList.toggle('admin-tab-hidden',!cfg.showCommands);
    document.querySelector('.admin-section-note')?.classList.toggle('admin-tab-hidden',group!=='today');
    document.querySelectorAll('.admin-side [data-admin-group]').forEach(link=>link.classList.toggle('is-active',link.dataset.adminGroup===group));
  };
  const openTarget=(group,id)=>{
    setTab(group);
    requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'}));
  };
  function setup(){
    document.querySelectorAll('[data-admin-tab]').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.adminTab)));
    document.querySelectorAll('.admin-side [data-admin-group]').forEach(link=>link.addEventListener('click',event=>{
      const id=link.getAttribute('href')?.replace(/^#/,'');
      if(!id)return;
      event.preventDefault();
      history.replaceState(null,'','#'+id);
      openTarget(link.dataset.adminGroup||groupForTarget(id)||'today',id);
    }));
    document.getElementById('quickAddMerchant')?.addEventListener('click',()=>{
      openTarget('members','merchantManager');
      setTimeout(()=>document.getElementById('addMerchantBtn')?.click(),80);
    });
    document.getElementById('quickAddNotice')?.addEventListener('click',()=>{
      openTarget('content','noticeManager');
      setTimeout(()=>document.getElementById('addNoticeBtn')?.click(),80);
    });
    const period=document.getElementById('towerPeriod'),periodSlot=document.getElementById('adminGlobalPeriod');
    if(period&&periodSlot)periodSlot.append(period);
    const due=document.getElementById('towerReviewDueCount'),dueSection=document.querySelector('.tower-review-due');
    const syncDue=()=>{
      const count=Number.parseInt(due?.textContent||'',10);
      dueSection?.classList.toggle('is-empty',Number.isFinite(count)&&count===0);
    };
    if(due){new MutationObserver(syncDue).observe(due,{childList:true,subtree:true,characterData:true});syncDue()}
    const hashId=location.hash.replace(/^#/,'');
    setTab(groupForTarget(hashId)||'today');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();