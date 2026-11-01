(()=>{
'use strict';
const groups=Object.freeze({
  review:{label:'심사·승인',items:[['memberReview','정회원 신청 승인'],['festivalManager','축제 참여부스 선정']]},
  oversight:{label:'운영 감독',items:[['controlTower','상권 운영 현황'],['petitionManager','민원·동의 접수'],['ipArchive','지식재산권 자료실']]},
  settings:{label:'제한 설정',items:[['languageManager','다국어 게시 검증']]}
});
const legacy=Object.freeze({
  merchantManager:'점포·회원 명부',noticeManager:'공지·행사 관리',couponManager:'쿠폰 관리',
  resourceManager:'공식 자료실',siteModeManager:'홈페이지 첫화면',educationSurveyManager:'교육 설문 관리'
});
const owner={};
for(const [group,detail] of Object.entries(groups))for(const [id,label] of detail.items)owner[id]={group,label};
for(const [id,label] of Object.entries(legacy))owner[id]={group:'legacy',label};
const panels=Object.keys(owner);
const params=new URLSearchParams(location.search);
const inline=params.get('inline')==='1';
const embeddedId=params.get('section');
const root=document.documentElement;
let selected='';
function safeHash(){try{return decodeURIComponent(location.hash.slice(1))}catch{return ''}}
function currentFromUrl(){
  if(inline)return panels.includes(embeddedId)?embeddedId:null;
  const hash=safeHash();
  return panels.includes(hash)?hash:panels.includes(params.get('section'))?params.get('section'):'memberReview';
}
function routeTo(id){
  if(inline||!owner[id])return;
  const url=new URL(location.href);
  url.searchParams.delete('section'); // Old ?section= must never contradict a newer #panel.
  url.hash=id;
  history.pushState(null,'',url.pathname+url.search+url.hash);
  show(id);
  window.scrollTo({top:0,behavior:'auto'});
}
function makeTab(id,label){
  const button=document.createElement('button');
  button.type='button';
  button.role='tab';
  button.id='cgma-tab-'+id;
  button.dataset.adminPanel=id;
  button.setAttribute('aria-controls',id);
  button.textContent=label;
  button.addEventListener('click',()=>routeTo(id));
  return button;
}
function renderSubtabs(id,group){
  const subnav=document.getElementById('adminSubtabs');
  if(!subnav)return;
  const items=groups[group]?.items||[[id,owner[id].label]];
  subnav.replaceChildren(...items.map(([key,label])=>makeTab(key,label)));
  subnav.querySelectorAll('[role="tab"]').forEach(tab=>{
    const active=tab.dataset.adminPanel===id;
    tab.setAttribute('aria-selected',String(active));
    tab.tabIndex=active?0:-1;
    tab.classList.toggle('is-active',active);
  });
}
function show(id){
  if(!owner[id]){
    selected='';
    panels.forEach(key=>document.getElementById(key)?.classList.add('admin-tab-hidden'));
    return;
  }
  selected=id;
  const {group,label}=owner[id];
  root.dataset.cgmaAdminTab=group;
  root.dataset.cgmaAdminPanel=id;
  document.querySelectorAll('[data-admin-tab]').forEach(tab=>{
    const active=tab.dataset.adminTab===group;
    tab.setAttribute('aria-selected',String(active));
    tab.tabIndex=active?0:-1;
    tab.classList.toggle('is-active',active);
  });
  renderSubtabs(id,group);
  document.querySelectorAll('.admin-side [data-admin-group]').forEach(link=>{
    const active=link.getAttribute('href')==='#'+id;
    link.classList.toggle('is-active',active);
    if(active)link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  const metrics=id==='memberReview'?['pending']:id==='petitionManager'?['petition']:[];
  document.querySelectorAll('[data-admin-metric]').forEach(card=>{
    card.classList.toggle('admin-tab-hidden',!metrics.includes(card.dataset.adminMetric));
  });
  const metricBox=document.querySelector('.admin-metrics');
  if(metricBox)metricBox.hidden=metrics.length===0;
  panels.forEach(key=>{
    const panel=document.getElementById(key);
    if(!panel)return;
    panel.classList.toggle('admin-tab-hidden',key!==id);
    panel.setAttribute('role','tabpanel');
    panel.tabIndex=-1;
    panel.setAttribute('aria-labelledby','cgma-tab-'+key);
  });
  document.querySelector('.admin-command-grid')?.classList.add('admin-tab-hidden');
  document.querySelector('.admin-section-note')?.classList.add('admin-tab-hidden');
  const crumbs=document.getElementById('adminContextBreadcrumb');
  if(crumbs)crumbs.textContent=(groups[group]?.label||'기존 업무')+' / '+label;
  document.title=label+' | 청계면상인회 관리자';
}
function syncFromUrl(){
  const hash=safeHash();
  show(owner[hash]?hash:owner[params.get('section')]?params.get('section'):'memberReview');
}
function onTabKeys(event){
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
  const tabs=[...event.currentTarget.querySelectorAll('[role="tab"]')];
  const index=tabs.indexOf(document.activeElement);
  if(index<0)return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
    (index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  const target=tabs[next];
  if(!target)return;
  target.focus();
  if(target.dataset.adminPanel){routeTo(target.dataset.adminPanel);document.getElementById('cgma-tab-'+target.dataset.adminPanel)?.focus();}
  else if(target.dataset.adminTab)routeTo(groups[target.dataset.adminTab].items[0][0]);
}
function setup(){
  if(inline){
    root.classList.add('cgma-embedded-workbench');
    show(panels.includes(embeddedId)?embeddedId:null);
    return;
  }
  document.querySelectorAll('[data-admin-tab]').forEach(button=>
    button.addEventListener('click',()=>routeTo(groups[button.dataset.adminTab].items[0][0])));
  document.querySelectorAll('.admin-side a[href^="#"]').forEach(link=>
    link.addEventListener('click',event=>{
      const id=link.getAttribute('href').slice(1);
      if(!owner[id])return;
      event.preventDefault();
      routeTo(id);
    }));
  document.querySelectorAll('.admin-metric[href^="#"]').forEach(link=>
    link.addEventListener('click',event=>{
      const id=link.getAttribute('href').slice(1);
      if(!owner[id])return;
      event.preventDefault();
      routeTo(id);
    }));
  document.querySelector('.admin-workspace-tabs')?.addEventListener('keydown',onTabKeys);
  document.getElementById('adminSubtabs')?.addEventListener('keydown',onTabKeys);
  const due=document.getElementById('towerReviewDueCount');
  const dueSection=document.querySelector('.tower-review-due');
  if(due){
    const syncDue=()=>dueSection?.classList.toggle('is-empty',Number.parseInt(due.textContent||'',10)===0);
    new MutationObserver(syncDue).observe(due,{childList:true,subtree:true,characterData:true});
    syncDue();
  }
  show(currentFromUrl());
  window.addEventListener('hashchange',syncFromUrl);
  window.addEventListener('popstate',syncFromUrl);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
else setup();
})();