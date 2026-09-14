const homeGroups={
  'market-map':['market-map','registered-market'],
  resources:['resources'],
  news:['news'],
  about:['about'],
  live:['live'],
  member:['login','member-notice','join','join-form']
};
const homeRoot={
  'market-map':'market-map',resources:'resources',news:'news',about:'about',live:'live',member:'login'
};
const managedIds=[...new Set(Object.values(homeGroups).flat())];
const serviceLinks=[...document.querySelectorAll('[data-home-section]')];
const ticker=document.querySelector('.ticker');

function groupForTarget(target){
  if(!target)return null;
  for(const [group,ids] of Object.entries(homeGroups)){
    if(ids.some(id=>document.getElementById(id)?.contains(target)))return group;
  }
  return null;
}

function setCollapsed(){
  managedIds.forEach(id=>{const section=document.getElementById(id);if(section)section.hidden=true;});
  if(ticker)ticker.hidden=true;
  serviceLinks.forEach(link=>link.classList.remove('active'));
  document.body.removeAttribute('data-home-view');
}

function activateHomeGroup(group,target,{scroll=true,history=true}={}){
  if(!homeGroups[group])return false;
  setCollapsed();
  homeGroups[group].forEach(id=>{const section=document.getElementById(id);if(section)section.hidden=false;});
  serviceLinks.forEach(link=>link.classList.toggle('active',link.dataset.homeSection===group));
  document.body.dataset.homeView=group;
  const destination=target||document.getElementById(homeRoot[group]);
  if(history&&destination){
    const nextHash=`#${destination.id}`;
    if(location.hash!==nextHash)window.history.pushState({homeGroup:group},'',nextHash);
  }
  requestAnimationFrame(()=>{
    window.dispatchEvent(new Event('resize'));
    if(scroll&&destination)destination.scrollIntoView({behavior:'smooth',block:'start'});
  });
  return true;
}

function openFromHash({scroll=false}={}){
  const id=decodeURIComponent(location.hash.replace(/^#/,''));
  if(!id||id==='top'){setCollapsed();return false;}
  const target=document.getElementById(id);
  const group=groupForTarget(target);
  return group?activateHomeGroup(group,target,{scroll,history:false}):false;
}

setCollapsed();
openFromHash({scroll:false});

document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(!link)return;
  const id=decodeURIComponent(link.getAttribute('href').slice(1));
  if(id==='top'){
    event.preventDefault();
    setCollapsed();
    if(location.hash)window.history.pushState({},'',location.pathname+location.search);
    document.getElementById('top')?.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }
  const target=document.getElementById(id);
  const group=link.dataset.homeSection||groupForTarget(target);
  if(!group)return;
  event.preventDefault();
  activateHomeGroup(group,target,{scroll:true,history:true});
});

window.addEventListener('popstate',()=>{
  if(!openFromHash({scroll:true})){
    setCollapsed();
    document.getElementById('top')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
});
