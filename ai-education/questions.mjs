// Single public questionnaire contract reused by the client and Cloudflare Pages API.
export const SURVEY_VERSION = 3;
export const SURVEY_QUESTIONS = Object.freeze([
  {key:'industry',title:'주로 운영하는 업종',options:['음식점·카페','농수산물·식품','소매·잡화','미용·생활서비스','숙박·관광','제조·수리','창업 준비','현재 운영 사업장 없음','기타']},
  {key:'role',title:'사업장 내 역할',options:['대표·점주','가족 종사자','직원','예비 창업자','해당 없음(사업장 없음)','기타']},
  {key:'experience',title:'AI 도구 사용 경험',options:['전혀 없음','한두 번 사용','가끔 사용','주 1~2회','거의 매일']},
  {key:'confidence',title:'디지털 기기 활용 수준',options:['기초부터 필요','검색·메신저 가능','문서·사진 활용 가능','업무 도구에 익숙함']},
  {key:'difficulties',title:'현재 매장 운영의 어려움',multiple:true,options:['신규 고객 확보','온라인 홍보','매출·재고 관리','사진·영상 제작','고객 응대·리뷰','행정·문서 작성','온라인 판매·예약','해당 없음','기타']},
  {key:'topics',title:'배우고 싶은 AI 교육 (선택 순서대로 1~3순위)',multiple:true,options:['ChatGPT·생성형 AI 기초','휴대폰 AI 활용','상품 사진·홍보 이미지','SNS·블로그·지도 홍보','숏폼·홍보영상','고객 응대·리뷰 관리','엑셀·매출·재고 분석','온라인 판매·예약 관리','지원사업·행정 문서','AI 자동화·챗봇','기타','ChatGPT 질문법·실무 활용','AI 상품 소개·홍보문구 작성','네이버플레이스·지도 관리','블로그 글쓰기·검색 노출','인스타그램·페이스북 홍보','포스터·전단·메뉴판 만들기','사진 보정·배경 제거','영상 자막·음성·편집','고객 상담·응대 문구','리뷰 분석·답변 작성','엑셀 기초·장부 정리','매출 분석·판매 예측','재고·발주·원가 관리','스마트스토어·온라인몰 운영','정부지원사업 검색·신청','사업계획서·제안서 작성','반복업무 AI 자동화','업종별 AI 활용 실습']},
  {key:'respondent_type',title:'응답자 종류',options:['소상공인·자영업자(대표)','소상공인 사업장 종사자','예비 창업자','프리랜서·1인 사업자','일반 재직자','교직원','학생','지역 주민','상인회·단체 관계자','기타']},
  {key:'available_devices',title:'현재 이용 가능한 기기',multiple:true,options:['컴퓨터','노트북','태블릿','핸드폰','기타','사용 가능한 기기 없음']},
  {key:'preferred_devices',title:'교육 희망 기기',multiple:true,options:['컴퓨터','노트북','태블릿','핸드폰','기타']},
  {key:'preferred_places',title:'교육 희망 장소',multiple:true,options:['목포대학교','도시재생센터','상가','기타']},
  {key:'training_style',title:'선호하는 교육 방식',multiple:true,options:['강사 설명·시연','직접 따라 하는 실습','업종별 소그룹','1:1 매장 문제 해결','온라인 강의','기타']},
  {key:'preferred_days',title:'교육 희망 요일',multiple:true,options:['월요일','화요일','수요일','목요일','금요일','토요일','일요일']},
  {key:'preferred_times',title:'교육 희망 시간대',multiple:true,options:['오전 9~12시','오후 1~5시','저녁 6~9시']},
  {key:'course_length',title:'희망 교육 횟수',options:['1회(2시간)','2회(4시간)','4회(8시간)','6회 이상','정기 교육']},
  {key:'start_period',title:'교육 희망 시작 시기',options:['가능한 빨리','1개월 이내','1~3개월 이내','3개월 이후','일정 미정']},
  {key:'participation',title:'실제 교육 참여 의향',options:['적극 참여','일정이 맞으면 참여','교육 내용을 보고 결정','현재는 관심만 있음']}
]);
