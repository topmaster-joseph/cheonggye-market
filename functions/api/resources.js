import { cgmaAdmin } from '../_shared/cgma-admin.js';
import { RESOURCE_BODY_DEFAULTS } from '../_shared/resource-default-content.js';

const DEFAULTS=[
  ['parking-petition','essential','link','주차장 건립 서명하기','','주차 환경 개선을 위한 참여 링크',10,1,1],
  ['bylaws','essential','link','상인회 정관·규약','','상인회 운영 기준',20,1,0],
  ['member-registration','essential','link','온라인 회원등록','','회원가입 신청',30,1,1],
  ['dues-ledger','essential','link','회비 납부내역','','회비 납부 현황 확인',40,1,0],
  ['festival-2025','festival','video','2025 가을 골목축제','https://youtu.be/CHWgslHyHYI','골목축제 영상',10,1,1],
  ['festival-2024','festival','video','2024 가을 골목축제','https://www.youtube.com/watch?v=aF9hOSdgXSA','골목축제 영상',20,1,0],
  ['community-plan-2025','support','link','25년 마을공동체 지원사업 기본계획','','상권 관련 지원사업',10,1,0],
  ['support-plan','support','link','지원사업 기본계획','','상권 관련 지원사업',20,1,0],
  ['merchant-list-2024','support','link','가맹점 명단(24년 12월 31일 기준)','','가맹점 현황',30,1,0],
  ['local-commercial-plan','revitalization','link','동네상권발전소 지원사업 기본계획','','상권활성화 지원사업',10,1,0],
  ['autonomous-district-info','revitalization','link','자율상권 구역 지정에 관한 정보','','상권활성화 지원사업',20,1,0],
  ['hearing-2025','revitalization','video','25년 11월 12일 자율상권구역 지원사업 공청회 영상','https://youtube.com/live/SbIzhRrBls0?feature=share','공청회 기록',30,1,0],
  ['urban-ordinance','urban','link','무안군 도시재생지원에 관한 조례','https://www.law.go.kr/LSW/ordinInfoP.do?ordinSeq=1346467','도시재생 특화사업',10,1,0],
  ['urban-master-plan','urban','link','청계면 도시재생 기본계획','http://www.muanurc.or.kr/user/one_page/run/page_cd/203040','도시재생 특화사업',20,1,0],
  ['urban-brief-2024','urban','link','청계면 도시재생 설명자료(24.02.27)','','도시재생 설명자료',30,1,0],
  ['garden-map-2025','urban','link','청계정원 구역도 및 조감도(25.11.12)','','도시재생 공간자료',40,1,0],
  ['modu-square','communication','link','정부 모두의 광장(정책·민원)','https://modu.pcpp.go.kr/suggest','정책 제안·민원',10,1,0],
  ['epeople','communication','link','국민신문고 바로가기','https://www.epeople.go.kr/index.jsp','국민 민원·제안',20,1,0],
  ['mokpo-agora','communication','link','목포대 소통창구 아고라','https://www.mokpo.ac.kr/www/182/subview.do','목포대학교 소통채널',30,1,0],
  ['muan-urc','communication','link','무안군 도시재생 지원센터','https://www.muanurc.or.kr/','지역 도시재생 정보',40,1,0]
];

const schema=`CREATE TABLE IF NOT EXISTS cgma_resources(
  id TEXT PRIMARY KEY, section TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'link', title TEXT NOT NULL,
  url TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 100,
  visible INTEGER NOT NULL DEFAULT 1, featured INTEGER NOT NULL DEFAULT 0, body TEXT,
  updated_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;
async function ensure(db){
  await db.prepare(schema).run();
  const columns=await db.prepare('PRAGMA table_info(cgma_resources)').all();
  if(!(columns.results||[]).some(column=>column.name==='body')){
    await db.prepare('ALTER TABLE cgma_resources ADD COLUMN body TEXT').run();
  }
  const row=await db.prepare('SELECT COUNT(*) AS count FROM cgma_resources').first();
  if(Number(row?.count||0)===0){
    await db.batch(DEFAULTS.map(v=>db.prepare('INSERT OR IGNORE INTO cgma_resources(id,section,kind,title,url,note,sort_order,visible,featured) VALUES(?,?,?,?,?,?,?,?,?)').bind(...v)));
  }
  const seeds=Object.entries(RESOURCE_BODY_DEFAULTS);
  if(seeds.length){
    await db.batch(seeds.map(([id,body])=>db.prepare('UPDATE cgma_resources SET body=? WHERE id=? AND body IS NULL').bind(body,id)));
  }
  await db.prepare("UPDATE cgma_resources SET url='' WHERE id IN ('parking-petition','bylaws','member-registration','dues-ledger','community-plan-2025','support-plan','merchant-list-2024','local-commercial-plan','autonomous-district-info','urban-brief-2024','garden-map-2025')").run();
}

function cleanText(v,n=240){return String(v??'').trim().slice(0,n)}
function cleanUrl(v){const value=cleanText(v,1600);try{const u=new URL(value);if(!['https:','http:','mailto:','tel:'].includes(u.protocol))return '';return u.toString()}catch{return ''}}
function rowInput(body){return {section:cleanText(body.section,40)||'essential',kind:['link','video'].includes(body.kind)?body.kind:'link',title:cleanText(body.title,160),url:cleanUrl(body.url),note:cleanText(body.note,500),body:cleanText(body.body,20000),sort_order:Number.isFinite(Number(body.sort_order))?Math.trunc(Number(body.sort_order)):100,visible:body.visible===false?0:1,featured:body.featured?1:0}}
function noStore(body,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store'}})}
function sourceKind(value,kind){
  if(kind==='video')return 'video';
  return String(value||'').trim()?'website':'internal';
}
function publicItem(row,{detail=false}={}){
  const type=sourceKind(row.url,row.kind);
  const item={id:row.id,section:row.section,kind:row.kind,title:row.title,note:row.note,sort_order:row.sort_order,visible:row.visible,featured:row.featured};
  if(detail)item.body=row.body||'';
  if(type!=='internal'&&row.url)item.public_url=row.url;
  return item;
}

export async function onRequestGet({request,env}){
  const db=env.cheonggye_market_notices;await ensure(db);
  const url=new URL(request.url),includeHidden=url.searchParams.get('include_hidden')==='1',id=cleanText(url.searchParams.get('id'),80);
  if(includeHidden){const admin=await cgmaAdmin(request);if(!admin.allowed)return noStore({error:admin.reason},admin.status)}
  if(id){
    const query=includeHidden?'SELECT * FROM cgma_resources WHERE id=?':'SELECT * FROM cgma_resources WHERE id=? AND visible=1';
    const row=await db.prepare(query).bind(id).first();
    if(!row)return noStore({error:'resource_not_found'},404);
    return includeHidden?noStore({item:row}):Response.json({item:publicItem(row,{detail:true})},{headers:{'Cache-Control':'public, max-age=30, s-maxage=60'}});
  }
  const query=includeHidden?'SELECT * FROM cgma_resources ORDER BY section,sort_order,title':'SELECT * FROM cgma_resources WHERE visible=1 ORDER BY section,sort_order,title';
  const result=await db.prepare(query).all();
  const items=includeHidden?result.results:(result.results||[]).map(row=>publicItem(row));
  return Response.json({items},{headers:{'Cache-Control':includeHidden?'no-store':'public, max-age=30, s-maxage=60'}});
}

export async function onRequestPost({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return noStore({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;await ensure(db);
  const body=await request.json(),v=rowInput(body);if(!v.title)return noStore({error:'title_required'},400);
  const id=cleanText(body.id,80).toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||crypto.randomUUID();
  try{
    await db.prepare('INSERT INTO cgma_resources(id,section,kind,title,url,note,body,sort_order,visible,featured,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,v.section,v.kind,v.title,v.url,v.note,v.body,v.sort_order,v.visible,v.featured,admin.user.email||admin.user.id).run();
    return noStore({ok:true,id},201);
  }catch{return noStore({error:'resource_create_failed'},409)}
}

export async function onRequestPut({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return noStore({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;await ensure(db);
  const body=await request.json(),id=cleanText(body.id,80),v=rowInput(body);if(!id||!v.title)return noStore({error:'id_title_required'},400);
  await db.prepare('UPDATE cgma_resources SET section=?,kind=?,title=?,url=?,note=?,body=?,sort_order=?,visible=?,featured=?,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(v.section,v.kind,v.title,v.url,v.note,v.body,v.sort_order,v.visible,v.featured,admin.user.email||admin.user.id,id).run();
  return noStore({ok:true,id});
}
export async function onRequestDelete({request,env}){
  const admin=await cgmaAdmin(request);if(!admin.allowed)return noStore({error:admin.reason},admin.status);
  const db=env.cheonggye_market_notices;await ensure(db);
  const id=cleanText(new URL(request.url).searchParams.get('id'),80);if(!id)return noStore({error:'id_required'},400);
  await db.prepare('DELETE FROM cgma_resources WHERE id=?').bind(id).run();
  return noStore({ok:true,id});
}
