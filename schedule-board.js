/* 청계면상인회 일정표: public reading, server-authorized in-place editing.
 * Visitors only ever see published rows. Edit controls appear after
 * /api/admin-session confirms the signed-in account, and every write is
 * re-authorized on the server. All user text is rendered with textContent. */
(()=>{
'use strict';
const app=document.getElementById('scheduleApp');
const preview=document.getElementById('schedulePreview');
if(!app&&!preview)return;

const SUPABASE='https://renzehysxirjilvdxacv.supabase.co';
const PUBLISHABLE='sb_publishable_0QjB0WzZbjrd-FJ5D5cR7A_xUkXyOY_';
const STORAGE_KEY='sb-renzehysxirjilvdxacv-auth-token';
const CATEGORIES=['행사','회의','교육','축제','모집','기타'];
const WEEK=['일','월','화','수','목','금','토'];
const route=value=>window.CGMA_ROUTE?.route(value)||value;

const ERRORS={
  title_required:'제목을 입력해 주세요.',start_date_invalid:'시작일을 확인해 주세요.',
  end_date_invalid:'종료일을 확인해 주세요.',end_before_start:'종료가 시작보다 빠를 수 없습니다.',
  span_too_long:'일정 기간은 1년 이내로 입력해 주세요.',start_time_invalid:'시작 시간을 확인해 주세요.',
  end_time_invalid:'종료 시간을 확인해 주세요.',start_time_required:'종료 시간을 넣으려면 시작 시간도 입력해 주세요.',
  link_invalid:'관련 링크는 http(s)로 시작하는 주소만 입력할 수 있습니다.',
  login_required:'로그인이 필요합니다.',invalid_session:'로그인이 만료되었습니다. 다시 로그인해 주세요.',
  tenant_admin_required:'상인회 관리자 권한이 필요합니다.',not_found:'이미 삭제되었거나 찾을 수 없는 일정입니다.'
};

const kstToday=()=>{
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=type=>parts.find(p=>p.type===type)?.value||'';
  return get('year')+'-'+get('month')+'-'+get('day');
};
const validDate=value=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return false;
  const parsed=new Date(value+'T00:00:00Z');
  return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
};
const shiftMonth=(month,delta)=>{
  const [y,m]=month.split('-').map(Number);
  const d=new Date(Date.UTC(y,m-1+delta,1));
  return d.toISOString().slice(0,7);
};
const daysIn=month=>{const [y,m]=month.split('-').map(Number);return new Date(Date.UTC(y,m,0)).getUTCDate()};
const weekdayOf=date=>new Date(date+'T00:00:00Z').getUTCDay();
const dot=date=>date.replaceAll('-','.');
const shortDate=date=>{const [,m,d]=date.split('-');return Number(m)+'.'+Number(d)+'('+WEEK[weekdayOf(date)]+')'};
function when(item){
  const range=item.endDate&&item.endDate!==item.startDate;
  let text=shortDate(item.startDate);
  if(item.startTime)text+=' '+item.startTime;
  if(range)text+=' ~ '+shortDate(item.endDate);
  if(item.endTime)text+=(range?' ':'~')+item.endTime;
  return text;
}
const covers=(item,date)=>item.startDate<=date&&item.endDate>=date;

// Public, read-only pointer: never carries auth state or admin flags.
function shareUrl(item){
  const url=new URL(route('/'),location.origin);
  url.searchParams.set('schedule',String(item.id));
  url.searchParams.set('date',item.startDate);
  url.hash='schedule';
  return url.href;
}
function parseShared(){
  const params=new URLSearchParams(location.search);
  const id=params.get('schedule')||'',date=params.get('date')||'';
  return /^[1-9]\d{0,12}$/.test(id)&&validDate(date)?{id:Number(id),date}:null;
}

function make(tag,cls,text){
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);
  return el;
}
function button(label,cls,handler){
  const b=make('button',cls,label);b.type='button';
  if(handler)b.addEventListener('click',handler);
  return b;
}

// ---- auth (same verified path as the notice board) ----
function storedToken(){
  try{
    const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    const session=stored?.currentSession||stored?.session||stored;
    if(typeof session?.access_token==='string'&&(!session.expires_at||session.expires_at>Date.now()/1000+30))return session.access_token;
  }catch{}
  return '';
}
async function accessToken(){
  try{
    if(window.supabase?.createClient){
      const client=window.__CGMA_NOTICE_AUTH||(window.__CGMA_NOTICE_AUTH=window.supabase.createClient(SUPABASE,PUBLISHABLE));
      const token=(await client.auth.getSession()).data?.session?.access_token;
      if(token)return token;
    }
  }catch{}
  return storedToken();
}
async function checkAdmin(){
  const token=await accessToken();
  if(!token)return '';
  try{
    const res=await fetch(route('/api/admin-session'),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
    const grant=await res.json().catch(()=>({}));
    return res.ok&&grant.allowed===true?token:'';
  }catch{return ''}
}

// ---- state ----
const today=kstToday();
const shared=parseShared();
const state={
  month:(shared?.date||today).slice(0,7),selected:shared?.date||'',highlight:shared?.id||0,
  items:[],upcoming:[],token:'',loading:false,error:''
};

async function fetchMonth(){
  state.loading=true;state.error='';renderApp();
  const params=new URLSearchParams({month:state.month,upcoming:'5'});
  if(state.token)params.set('manage','1');
  params.set('t',String(Date.now()));
  let revoked=false;
  try{
    const res=await fetch(route('/api/schedule?'+params),{
      cache:'no-store',headers:state.token?{Authorization:'Bearer '+state.token}:{}
    });
    const data=await res.json().catch(()=>({}));
    if((res.status===401||res.status===403)&&state.token){revoked=true}
    else{
      if(!res.ok)throw new Error(data.error||data.reason||'schedule_load_failed');
      state.items=Array.isArray(data.items)?data.items:[];
      state.upcoming=Array.isArray(data.upcoming)?data.upcoming:[];
    }
  }catch{
    state.items=[];state.error='일정을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.';
  }finally{state.loading=false}
  // An expired admin grant falls back to the public view instead of failing.
  if(revoked){state.token='';syncAdminUi();return fetchMonth()}
  renderApp();renderPreview();
}

// ---- home preview ----
function renderPreview(){
  if(!preview)return;
  preview.replaceChildren();
  const rows=state.upcoming.slice(0,3);
  if(!rows.length){
    preview.append(make('li','schedule-empty',state.error?'일정을 불러오지 못했습니다.':'예정된 일정이 아직 없습니다.'));
    return;
  }
  rows.forEach(item=>{
    const li=make('li','schedule-preview-item');
    const a=make('a');a.href=shareUrl(item);
    const date=make('span','schedule-preview-date');
    const [,m,d]=item.startDate.split('-');
    date.append(make('b','',Number(d)),make('small','',Number(m)+'월'));
    const body=make('span','schedule-preview-body');
    body.append(make('em','schedule-chip',item.category),make('strong','',item.title),make('small','',when(item)+(item.place?' · '+item.place:'')));
    a.append(date,body);li.append(a);preview.append(li);
  });
}

// ---- full calendar ----
let editorEl,formEl,statusEl;
function renderApp(){
  if(!app)return;
  app.replaceChildren();
  app.setAttribute('aria-busy',state.loading?'true':'false');
  const cal=make('div','schedule-calendar');
  const head=make('div','schedule-month');
  const label=make('strong','schedule-month-label',state.month.replace('-','년 ')+'월');
  label.setAttribute('aria-live','polite');
  head.append(
    button('‹','schedule-nav',()=>{state.month=shiftMonth(state.month,-1);state.selected='';fetchMonth()}),
    label,
    button('›','schedule-nav',()=>{state.month=shiftMonth(state.month,1);state.selected='';fetchMonth()})
  );
  head.firstChild.setAttribute('aria-label','이전 달');head.lastChild.setAttribute('aria-label','다음 달');
  const todayBtn=button('오늘','schedule-today',()=>{state.month=today.slice(0,7);state.selected=today;fetchMonth()});
  head.append(todayBtn);
  const grid=make('div','schedule-grid');grid.setAttribute('role','grid');grid.setAttribute('aria-label',label.textContent+' 달력');
  WEEK.forEach((w,i)=>{const h=make('span','schedule-weekday'+(i===0?' is-sun':i===6?' is-sat':''),w);h.setAttribute('role','columnheader');grid.append(h)});
  const lead=weekdayOf(state.month+'-01');
  for(let i=0;i<lead;i++)grid.append(make('span','schedule-blank'));
  for(let day=1;day<=daysIn(state.month);day++){
    const date=state.month+'-'+String(day).padStart(2,'0');
    const events=state.items.filter(item=>covers(item,date));
    const wd=weekdayOf(date);
    const cell=button('','schedule-day'+(wd===0?' is-sun':wd===6?' is-sat':'')+(date===today?' is-today':'')+(date===state.selected?' is-selected':'')+(events.length?' has-events':''),()=>{
      state.selected=state.selected===date?'':date;renderApp();
      app.querySelector('.schedule-list')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    });
    cell.setAttribute('role','gridcell');
    cell.setAttribute('aria-pressed',date===state.selected?'true':'false');
    cell.setAttribute('aria-label',dot(date)+(events.length?' 일정 '+events.length+'건':' 일정 없음'));
    cell.append(make('span','schedule-num',day));
    const marks=make('span','schedule-marks');
    events.slice(0,2).forEach(item=>marks.append(make('span','schedule-mark'+(item.status==='hidden'?' is-hidden':''),item.title)));
    if(events.length>2)marks.append(make('span','schedule-more','+'+(events.length-2)));
    cell.append(marks);
    grid.append(cell);
  }
  cal.append(head,grid);

  const list=make('div','schedule-list');
  const listHead=make('div','schedule-list-head');
  const rows=state.selected?state.items.filter(item=>covers(item,state.selected)):state.items;
  listHead.append(make('h3','',state.selected?dot(state.selected)+' 일정':Number(state.month.slice(5))+'월 전체 일정'));
  if(state.selected)listHead.append(button('월 전체 보기','schedule-reset',()=>{state.selected='';renderApp()}));
  list.append(listHead);
  if(state.loading&&!state.items.length)list.append(make('p','schedule-empty','일정을 불러오는 중입니다.'));
  else if(state.error)list.append(make('p','schedule-empty',state.error));
  else if(!rows.length)list.append(make('p','schedule-empty',state.selected?'이 날에는 등록된 일정이 없습니다.':'이달에 등록된 일정이 없습니다.'));
  rows.forEach(item=>list.append(card(item)));
  app.append(cal,list);
  const target=state.highlight&&app.querySelector('[data-schedule-id="'+state.highlight+'"]');
  if(target){target.classList.add('is-shared');target.scrollIntoView({behavior:'smooth',block:'center'});state.highlight=0}
}

function card(item){
  const art=make('article','schedule-card'+(item.status==='hidden'?' is-hidden':''));
  art.dataset.scheduleId=String(item.id);
  const meta=make('div','schedule-card-meta');
  meta.append(make('span','schedule-chip',item.category));
  if(item.status==='hidden')meta.append(make('span','schedule-chip is-private','비공개'));
  meta.append(make('time','',when(item)));
  meta.lastChild.dateTime=item.startDate+(item.startTime?'T'+item.startTime:'');
  art.append(meta,make('h4','',item.title));
  if(item.place)art.append(make('p','schedule-place','📍 '+item.place));
  if(item.description)art.append(make('p','schedule-desc',item.description));
  const actions=make('div','schedule-card-actions');
  if(item.link){
    const a=make('a','schedule-link','자세히 보기 ↗');a.href=item.link;a.target='_blank';a.rel='noopener noreferrer';actions.append(a);
  }
  if(item.status!=='hidden')actions.append(button('공유','schedule-share',()=>share(item)));
  if(state.token){
    actions.append(button('수정','schedule-edit',()=>openEditor(item)));
    actions.append(button('삭제','schedule-delete',()=>remove(item)));
  }
  art.append(actions);
  return art;
}

async function share(item){
  const url=shareUrl(item);
  const text='청계면상인회 일정\n'+item.title+'\n일정: '+when(item)+(item.place?'\n장소: '+item.place:'');
  try{
    if(navigator.share){await navigator.share({title:item.title,text,url});return}
    await navigator.clipboard.writeText(text+'\n'+url);
    flash('일정 링크를 복사했습니다.');
  }catch(error){if(error?.name!=='AbortError')prompt('아래 링크를 복사해 주세요.',url)}
}
function flash(message){
  const note=document.getElementById('scheduleNotice');
  if(!note)return;
  note.textContent=message;note.hidden=false;
  clearTimeout(flash.timer);flash.timer=setTimeout(()=>{note.hidden=true},2600);
}

// ---- editor ----
function field(labelText,input){const l=make('label','schedule-field');l.append(make('span','',labelText),input);return l}
function input(name,type,attrs={}){
  const el=document.createElement(type==='textarea'?'textarea':type==='select'?'select':'input');
  el.name=name;if(type!=='textarea'&&type!=='select')el.type=type;
  Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
  return el;
}
function buildEditor(){
  editorEl=document.getElementById('scheduleEditor');
  if(!editorEl)return;
  formEl=make('form','schedule-form');formEl.noValidate=false;
  const id=input('id','hidden');
  const category=input('category','select');
  CATEGORIES.forEach(c=>{const o=make('option','',c);o.value=c;category.append(o)});
  const row1=make('div','schedule-form-row');
  row1.append(field('분류',category),field('제목',input('title','text',{maxlength:'120',required:'',placeholder:'예: 10월 정기회의'})));
  const row2=make('div','schedule-form-row is-dates');
  row2.append(
    field('시작일',input('startDate','date',{required:''})),field('시작 시간 (선택)',input('startTime','time')),
    field('종료일 (선택)',input('endDate','date')),field('종료 시간 (선택)',input('endTime','time'))
  );
  const row3=make('div','schedule-form-row is-pair');
  row3.append(field('장소 (선택)',input('place','text',{maxlength:'120',placeholder:'예: 청계면 복지회관 2층'})),
    field('관련 링크 (선택)',input('link','url',{maxlength:'500',placeholder:'https://'})));
  const desc=field('내용 (선택)',input('description','textarea',{maxlength:'2000',rows:'4',placeholder:'참석 대상, 준비물, 문의처 등을 적어 주세요.'}));
  const foot=make('div','schedule-form-actions');
  const publish=make('label','schedule-publish');
  const check=input('published','checkbox');check.checked=true;
  publish.append(check,document.createTextNode(' 홈페이지에 공개'));
  const del=button('삭제','schedule-delete',()=>{const current=state.items.find(i=>i.id===Number(id.value));if(current)remove(current)});
  del.hidden=true;del.dataset.role='delete';
  const cancel=button('취소','schedule-cancel',closeEditor);
  const save=make('button','schedule-save','저장');save.type='submit';
  foot.append(publish,del,cancel,save);
  statusEl=make('p','schedule-form-status');statusEl.setAttribute('role','status');
  formEl.append(id,row1,row2,row3,desc,foot,statusEl);
  formEl.addEventListener('submit',submit);
  editorEl.append(formEl);
}
function openEditor(item){
  if(!state.token)return;
  if(!formEl)buildEditor();
  if(!formEl)return;
  formEl.reset();
  const f=formEl.elements;
  f.id.value=item?.id?String(item.id):'';
  f.category.value=item?.category||'행사';
  f.title.value=item?.title||'';
  f.startDate.value=item?.startDate||state.selected||(state.month===today.slice(0,7)?today:state.month+'-01');
  f.endDate.value=item&&item.endDate!==item.startDate?item.endDate:'';
  f.startTime.value=item?.startTime||'';f.endTime.value=item?.endTime||'';
  f.place.value=item?.place||'';f.link.value=item?.link||'';f.description.value=item?.description||'';
  f.published.checked=item?item.status!=='hidden':true;
  formEl.querySelector('[data-role="delete"]').hidden=!item;
  statusEl.textContent=item?'일정을 수정합니다.':'새 일정을 등록합니다.';
  editorEl.hidden=false;
  const add=document.getElementById('scheduleAdd');if(add)add.textContent='편집 닫기';
  editorEl.scrollIntoView({behavior:'smooth',block:'center'});
  f.title.focus({preventScroll:true});
}
function closeEditor(){
  if(!editorEl)return;
  editorEl.hidden=true;formEl?.reset();
  const add=document.getElementById('scheduleAdd');if(add)add.textContent='일정 추가';
}
async function write(method,url,body){
  const token=await checkAdmin();
  if(!token){state.token='';syncAdminUi();throw Object.assign(new Error('tenant_admin_required'),{code:'tenant_admin_required'})}
  state.token=token;
  const res=await fetch(route(url),{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Object.assign(new Error(data.error||'save_failed'),{code:data.error,field:data.field});
  return data;
}
async function submit(event){
  event.preventDefault();
  const f=formEl.elements,id=Number(f.id.value||0);
  const payload={
    category:f.category.value,title:f.title.value,startDate:f.startDate.value,endDate:f.endDate.value,
    startTime:f.startTime.value,endTime:f.endTime.value,place:f.place.value,link:f.link.value,
    description:f.description.value,status:f.published.checked?'published':'hidden'
  };
  if(id)payload.id=id;
  const save=formEl.querySelector('.schedule-save');save.disabled=true;
  statusEl.textContent='저장하고 있습니다…';
  try{
    await write(id?'PUT':'POST','/api/schedule',payload);
    closeEditor();
    state.month=payload.startDate.slice(0,7);state.selected=payload.startDate;
    flash(id?'일정을 수정했습니다.':'일정을 등록했습니다.');
    await fetchMonth();
  }catch(error){
    statusEl.textContent=ERRORS[error.code]||'저장하지 못했습니다. 입력 내용과 권한을 확인해 주세요.';
    if(error.field&&f[error.field])f[error.field].focus();
  }finally{save.disabled=false}
}
async function remove(item){
  if(!confirm('「'+item.title+'」 일정을 삭제할까요? 삭제하면 되돌릴 수 없습니다.'))return;
  try{
    await write('DELETE','/api/schedule?id='+encodeURIComponent(item.id));
    closeEditor();flash('일정을 삭제했습니다.');await fetchMonth();
  }catch(error){alert(ERRORS[error.code]||'삭제하지 못했습니다. 권한을 확인해 주세요.')}
}

function syncAdminUi(){
  const add=document.getElementById('scheduleAdd');
  if(add)add.hidden=!state.token;
  const hint=document.getElementById('scheduleLoginHint');
  if(hint)hint.hidden=Boolean(state.token);
  if(!state.token)closeEditor();
}
document.getElementById('scheduleAdd')?.addEventListener('click',()=>{
  if(editorEl&&!editorEl.hidden)closeEditor();else openEditor(null);
});
const login=document.getElementById('scheduleLogin');
if(login){
  const back=new URL(location.href);back.hash='schedule';
  login.href='https://auth.ekodi.kr/?site=cgma&direct=1&return_to='+encodeURIComponent(back.href);
}

async function refreshAuthority(){
  const token=await checkAdmin();
  const changed=Boolean(token)!==Boolean(state.token);
  state.token=token;syncAdminUi();
  if(changed)await fetchMonth();
}

window.CGMA_SCHEDULE=Object.freeze({reload:fetchMonth,shareUrl,parseShared});
fetchMonth().then(refreshAuthority);
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===null)refreshAuthority()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAuthority()});
})();
