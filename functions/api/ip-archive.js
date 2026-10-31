import { cgmaAdmin } from '../_shared/cgma-admin.js';

// EKODI/05_COMMUNITY/청계면상인회_브랜드자료실.
// Private, bounded register of existing uploaded files. Do not publish these
// locations in HTML, JS bundles, site maps or /api/resources.
const DOCUMENTS = Object.freeze([
  {
    id:'cgma-ip-archive-folder',
    category:'보관함',
    title:'청계면상인회 브랜드·지식재산권 문서 보관함',
    note:'청깨비 계약 및 권리 검토, 상표출원 준비 문서 보관 위치',
    url:'https://drive.google.com/drive/folders/1qYGwlqV8plbeQadjzAfoR-blcvHvrO_t',
    state:'보관 완료'
  },
  {
    id:'cgma-ip-originals',
    category:'디자인 원본',
    title:'청깨비·청계거리 Illustrator 원본 7종',
    note:'원본 AI 파일 6개, 대용량 브랜드 가이드 AI 분할본 7개 및 복원·해시 목록. 원본의 일반 공개를 금지합니다.',
    url:'https://drive.google.com/drive/folders/1L8vAKX_mjfjxcbluESFU3aoLDcAcE3ka',
    state:'보관 완료 · 비공개'
  },
  {
    id:'cgma-ip-application-pack',
    category:'상표출원',
    title:'청깨비 상표출원 준비서류 9종 ZIP',
    note:'권리확인 보충합의, 이사회 의결, 출원인 적격 확인, 출원정보·위임 등 서명·접수 전 초안',
    url:'https://drive.google.com/file/d/1iMu0r-Chufl4b0Pjfpf-0tOPxkD2jJ9l/view',
    state:'초안 보관 · 미출원'
  },
  {
    id:'cgma-ip-kipris-check',
    category:'선행조사',
    title:'KIPRIS 청깨비·유사 명칭 검색 결과 (2026.11.01)',
    note:'EKODI 자체 브라우저 공개조회 기록. 동일 명칭 0건은 등록 가능성 확정이 아님.',
    url:'https://drive.google.com/file/d/1Hj-KSJspsl1SaSiXNIinuAS7n2Ghsh2z/view',
    state:'조사 기록 보관'
  },
  {
    id:'cgma-ip-rights-review',
    category:'권리검토',
    title:'청깨비 저작권·상표권 법률 검토 (2026.11.01)',
    note:'청계면상인회 권리귀속 확인, 법인격·출원인 적격, 출원 전 점검 목록',
    url:'https://drive.google.com/file/d/13rjMKG-eWJUW_uGIgJv0mi67d8tskpqg/view',
    state:'검토 기록 보관'
  },
]);

const privateJson=(body,status=200)=>Response.json(body,{status,headers:{
  'Cache-Control':'no-store, private',
  'Pragma':'no-cache',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer'
}});

export async function onRequestGet({request}){
  // Always check the exact same tenant-scoped entitlement as /api/admin-session.
  const admin=await cgmaAdmin(request);
  if(!admin.allowed)return privateJson({error:admin.reason},admin.status);
  return privateJson({ok:true,scope:'tenant:cheonggye',category:'청깨비 지식재산권',documents:DOCUMENTS.map(item=>({...item})),notice:'원본 및 계약 관련 권리관계와 출원인 적격은 확인 중이며 상표 출원·등록은 완료되지 않았습니다.'});
}
