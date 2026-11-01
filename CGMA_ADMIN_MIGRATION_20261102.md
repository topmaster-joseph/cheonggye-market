# CGMA 관리자 단일화: 2026-11-02 이전 원장

## 원칙
- 통합 관리자 최종 주소: `https://ekodi.kr/cgma/admin`. 공개 홈페이지 대표 도메인 `https://cgma.or.kr`은 유지한다.
- 정회원 신청/승인은 Supabase 권한 원장 기반이며, Google Sheets 정회원 **명단** 편집과 구분한다.
- 계정 토큰을 URL, 로그, LocalStorage, 쿼리스트링에 옮기지 않는다. 임베드에서는 ekodi.kr 동일 출처의 부모/자식 창 메모리 메시지로만 전달하고, 각 API는 원래의 서버 권한 재검사를 수행한다.
- 사이트간 자료 이전·복제·삭제는 하지 않으며, 기존 데이터 원장 및 수정 이력을 그대로 사용한다.
- 기존 `cgma.or.kr/admin` 리다이렉트는 기능·권한·PC/모바일 운영 검증 후에만 설정한다.

## 기능별 이전 계획

| 탭 | 기존 UI | 소유 API/원장 | 검증할 권한 및 위험 | 우선순위 |
|---|---|---|---|---|
| 정회원 신청 승인 | `memberReview` | Supabase `access-api`, `membership-api` + 점포 명부 Pages D1 | `tenant:cheonggye` 승인권, 신규/기존 신청 분리, 승인 후 점포 반영 오류 표시 | 1 |
| 축제 참여부스 선정 | `festivalManager` | Supabase `cgma-festival-intake` | 정회원 자격·부스 최대 5개·중복선정 검증 | 1 |
| 상권 운영 현황 | `controlTower` | Pages `/api/admin-store-health`, `/api/admin-market-interventions`; D1 | tenant 관리자, 수동 개입 결정, 익명 반응 | 2 |
| 민원·동의 접수 | `petitionManager` | Pages `/api/parking-petition`; D1 | 수신 개인정보 비공개·감사 | 2 |
| 지식재산권 자료실 | `ipArchive` | Pages `/api/ip-archive`, `/api/ip-shares`; Google Drive 원본별 권한 | 발급 링크 만료·철회, 원본 Drive 권한은 별도 | 2 |
| 다국어 게시 검증 | `languageManager` | 중앙 `https://api.ekodi.kr/api/i18n/v1/admin` | 출처 site=cgma, 미검증 번역 비게시 | 3 |
| AI 교육 신청 현황 | `educationSurveyManager` | Pages `/api/ai-education-stats`, `/api/ai-education-share`; D1 | 집계와 연락처 분리, 보관기간·동의 | 3 |

## 시행 순서
1. 독립 Pages 화면에 `/operations-admin/` 재사용 URL 추가(내부 재작성, 공개 도메인 및 기존 관리자 링크 변경 없음).
2. `inline=1&section=<whitelisted panel>` 내장 UI 확인. EKODI 출처의 부모가 준비 알림을 받은 때에만 일시적인 로그인 토큰을 메시지로 전달; 기존 서버의 청계면 권한 검사 필수.
3. EKODI 공통 관리자 전용 메뉴와 연결. 경로/권한 구분은 `config/admin-menu-audience-policy.json`에 등록하고 로컬 회원·운영진 권한과 공존.
4. 데스크톱/모바일 및 로그인/비로그인/세션만료/업무별 읽기·쓰기 검증 후 `cgma.or.kr/admin`만 `https://ekodi.kr/cgma/admin`으로 이동. 공개 주소 `cgma.or.kr/` 불변.
5. 이중 코드가 운영상 더 이상 필요 없는 시점에만 퇴역 PR 별도로 처리.

## 현재 단계
1단계 Pages 내장 진입과 2단계에 필요한 동일 출처 메시지 수신 기능을 코드에 추가한 상태. 통합 관리자 메뉴, 실제 Pages 운영 URL, 이전 후 리다이렉트는 **확인필요**이며 본 작업 PR만으로 완료하지 않는다.
