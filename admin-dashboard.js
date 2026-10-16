(()=>{
'use strict';
const panels=['controlTower','merchantManager','memberReview','noticeManager','festivalManager','couponManager','resourceManager','siteModeManager','languageManager','petitionManager','educationSurveyManager'];
const groups=Object.freeze({
  review:{panels:['memberReview','festivalManager'],metrics:['pending']},
  oversight:{panels:['controlTower','petitionManager'],metrics:['petition']},
  settings:{panels:['languageManager'],metrics:[]}
});
const params=new URLSearchParams(location.search);
const inline=params.get('inline')==='1';
const embeddedId=params.get('section');
const isAllowedPanel=panels.includes(embeddedId);
const original=document.documentElement;
function groupForTarget(id){
  return Object.entries(groups).find(([,g])=>g.panels.includes(id))?.[0]||
    (panels.includes(id)?'legacy':'review');
}
function setTab(group,id){
  let cfg=groups[group]||groups.review;
  if(group==='inline')cfg={panels:isAllowedPanel?[embeddedId]:[],metrics:[]};
  else if(group==='legacy')cfg={panels:id&&panels.includes(id)?[id]:[],metrics:[]};
  original.dataset.cgmaAdminTab=group;
  document.querySelectorAll('[data-admin-tab]').forEach(button=>{
    const selected=button.dataset.adminTab===group;
    button.setAttribute('aria-selected',selected?'true':'false');
    button.classList.toggle('is-active',selected);
  });
  document.querySelectorAll('[data-admin-metric]').forEach(card=>
    card.classList.toggle('admin-tab-hidden',!cfg.metrics.includes(card.dataset.adminMetric)));
  panels.forEach(panel=>document.getElementById(panel)?.classList.toggle('admin-tab-hidden',!cfg.panels.includes(panel)));
  document.querySelector('.admin-command-grid')?.classList.add('admin-tab-hidden');
  document.querySelector('.admin-section-note')?.classList.add('admin-tab-hidden');
  document.querySelectorAll('.admin-side [data-admin-group]').forEach(link=>
    link.classList.toggle('is-active',link.dataset.adminGroup===group));
}
function openTarget(id){
  const group=groupForTarget(id);
  setTab(group,id);
  requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'}));
}
function setup(){
  if(inline){
    original.classList.add('cgma-embedded-workbench');
    if(!isAllowedPanel){setTab('inline');return}
    setTab('inline',embeddedId);
    return;
  }
  document.querySelectorAll('[data-admin-tab]').forEach(button=>
    button.addEventListener('click',()=>setTab(button.dataset.adminTab)));
  document.querySelectorAll('.admin-side [data-admin-group]').forEach(link=>
    link.addEventListener('click',event=>{
      const id=link.getAttribute('href')?.replace(/^#/,'');
      if(!id||!panels.includes(id))return;
      event.preventDefault();
      history.replaceState(null,'','#'+id);
      openTarget(id);
    }));
  const period=document.getElementById('towerPeriod');
  const slot=document.getElementById('adminGlobalPeriod');
  if(period&&slot)slot.append(period);
  const due=document.getElementById('towerReviewDueCount');
  const dueSection=document.querySelector('.tower-review-due');
  const syncDue=()=>{
    const count=Number.parseInt(due?.textContent||'',10);
    dueSection?.classList.toggle('is-empty',Number.isFinite(count)&&count===0);
  };
  if(due){new MutationObserver(syncDue).observe(due,{childList:true,subtree:true,characterData:true});syncDue()}
  const hash=location.hash.slice(1);
  if(panels.includes(hash))setTab(groupForTarget(hash),hash);
  else setTab('review');
  window.addEventListener('hashchange',()=>{
    const target=location.hash.slice(1);
    if(panels.includes(target))openTarget(target);
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
})();
