(()=>{
'use strict';
if(window.__CGMA_NATIVE_I18N_BOOTED)return;
window.__CGMA_NATIVE_I18N_BOOTED=true;

const VERSION=10;
const LOCALE_KEY='ekodi_user_locale';
const LEGACY_KEY='ekodi-language';
const COOKIE_KEY='ekodi_locale';
const QUERY_KEY='lang';
const SUPPORTED=new Set(['ko-KR','en','zh-CN','ja','vi','ne']);
const READY=new Set(['ko-KR','en']);
const PUBLICATION_STATUS_URL='https://api.ekodi.kr/api/i18n/v1/status?service=cgma';
const language=document.getElementById('siteLanguage');
let activeLocale='ko-KR';
let publishedReady=new Set(['ko-KR']);
let publicationKnown=false;
let publicationState='fail-closed';
let observer=null;
let scheduled=false;
let fallbackTimer=0;

const COPY={
  'ko-KR':{title:'청계면상인회 | 오늘도 청계에서 만나요',description:'무안군 청계면상인회 공식 홈페이지. 청계의 가게와 소식, 상생 프로그램을 만나보세요.',about:'상인회 소개',map:'가게찾기',resources:'공식자료',news:'상권소식',live:'온라인',login:'Google 로그인',join:'가입하기',liveKicker:'실시간 소통 공간',liveIntro:'정기회의와 온라인 임원회는 Jitsi에서, 현장 행사와 상권 소식은 YouTube에서 만납니다.',meetingTitle:'실시간 화상회의',meetingBody:'홈페이지 안에서 이름을 입력하고 회의에 참여할 수 있습니다. 카메라와 마이크는 참여자가 직접 허용할 때만 사용됩니다.',meetingOpen:'회의실을 새 창에서 열기 ↗',youtubeTitle:'YouTube 방송',youtubeBody:'라이브 중에는 실시간 영상을 보여주고, 방송이 없거나 임베드할 수 없을 때는 안전한 안내 카드로 전환합니다.',youtubeOpen:'YouTube 라이브 확인 ↗',home:'청계면상인회 홈',language:'언어 선택'},
  en:{title:'Cheonggye Merchants Association | Meet Cheonggye Today',description:'Official website of the Cheonggye Merchants Association in Muan. Find local shops, news, programs, and community information.',about:'About',map:'Find Shops',resources:'Official Info',news:'Market News',live:'Online',login:'Google Sign in',join:'Join',liveKicker:'Live connection space',liveIntro:'Meetings and online leadership sessions happen on Jitsi, while local events and market news are shared on YouTube.',meetingTitle:'Live video meeting',meetingBody:'Enter your name and join the meeting right here. Camera and microphone are used only after you grant permission.',meetingOpen:'Open meeting in a new window ↗',youtubeTitle:'YouTube Broadcast',youtubeBody:'A live stream appears here in real time. When no live stream is active, a safe status card links to the channel.',youtubeOpen:'Check YouTube Live ↗',home:'Cheonggye Merchants Association home',language:'Choose language'}
};

const UNPUBLISHED={
  en:{title:'English page is currently not published',body:'The Korean page remains available. Returning to Korean.'}
};

const PREPARING={
  'zh-CN':{title:'中文页面正在准备中',body:'正在完善完整翻译。页面将自动返回韩文版。'},
  ja:{title:'日本語ページを準備中です',body:'完全な翻訳を整備しています。韓国語ページへ自動的に戻ります。'},
  vi:{title:'Trang tiếng Việt đang được chuẩn bị',body:'Bản dịch đầy đủ đang được hoàn thiện. Trang sẽ tự động trở về tiếng Hàn.'},
  ne:{title:'नेपाली पृष्ठ तयार हुँदैछ',body:'पूर्ण अनुवाद तयार गरिँदैछ। पृष्ठ स्वचालित रूपमा कोरियन भाषामा फर्किनेछ।'}
};

const TEXT_ROWS=[
['본문 바로가기','Skip to content'],['청계면상인회','Cheonggye Merchants Association'],['가게찾기','Find Shops'],['상권소식','Market News'],['공식자료','Official Info'],['상인회 소개','About'],['온라인','Online'],['Google 로그인','Google Sign in'],['상인회 관리','Association Admin'],['가입하기','Join'],['홈','Home'],['소식','News'],['회원','Members'],
['📍 전남 무안 · 청계면','📍 Cheonggye, Muan, Jeonnam'],['🎓 목포대 후문 생활상권','🎓 Mokpo National Univ. Back Gate District'],['🤝 상인·주민·대학 연결','🤝 Merchants · Residents · University'],['오늘 청계에서','Today in Cheonggye'],['만나고, 찾고, 연결하세요.','Meet, discover, and connect.'],['처음 온 방문자는 가게와 혜택을 바로 찾고, 상인은 회원·내 가게 업무로 곧장 이동할 수 있습니다. 청계의 골목과 사람, 공식 소식을 한곳에서 이어드립니다.','Visitors can quickly find shops and offers, while merchants can go straight to membership and store operations. Discover Cheonggye’s streets, people, and official updates in one place.'],['오늘의 가게 찾기','Find a Shop Today'],['상인회원 · 내 가게','Merchant Member · My Shop'],['오늘의 상권소식','Today’s Market News'],['지도 표시 상가','Shops on Map'],['정회원 점포','Full Member Shops'],['오늘 혜택','Today’s Offers'],['책 · 문구','Books · Stationery'],['맛있는 한 끼','A Good Meal'],['커피 한 잔','A Cup of Coffee'],['승달산길에서 도림길까지','From Seungdalsan-gil to Dorim-gil'],['오늘의 청계가 이어집니다','Cheonggye connects today'],
['가게·혜택 바로 찾기','Find Shops & Offers'],['실제 도로지도에서 음식·카페·생활 점포와 오늘 혜택을 확인합니다.','See restaurants, cafés, everyday shops, and today’s offers on a real street map.'],['회원 · 내 가게 업무','Membership · My Shop'],['정회원 신청, 승인 확인, 내 가게 연결과 운영 화면으로 이동합니다.','Apply for full membership, check approval, connect your shop, and open its management screen.'],['공식자료 · 상권소식','Official Info · Market News'],['지원사업, 도시재생, 상인회 공지와 공식 기록을 빠르게 찾습니다.','Quickly find support programs, urban regeneration information, association notices, and official records.'],['같이 사는 골목','A Neighborhood We Share'],['대학과 동네의 만남','University Meets Community'],['매일 발견하는 로컬','Discover Local Every Day'],
['혼자보다 함께,','Together, not alone,'],['가게를 넘어','Beyond the shop,'],['동네로','Into the community'],['청계면상인회는 상인의 목소리를 모으고, 지역과 대학을 잇고, 다시 찾고 싶은 골목을 만듭니다.','The Cheonggye Merchants Association brings merchant voices together, connects the community and university, and builds streets people want to revisit.'],['정기 모임과 골목축제, 상생스탬프, 콘텐츠 공모전까지. 작은 가게들이 서로의 이웃이 되어 청계만의 내일을 차근차근 만들고 있습니다.','From regular meetings and street festivals to shared-reward stamps and content projects, local shops work as neighbors to shape Cheonggye’s future.'],['상인회와 함께하기','Join the Association'],['청계면상인회 임원·운영진','Association Leadership'],['회장','Chair'],['국장','Director'],['총무','General Affairs'],['기획팀장','Planning Lead'],['상권을 잇다','Connect the District'],['상인과 주민, 대학이 서로의 이웃이 되는 연결을 만듭니다.','We connect merchants, residents, and the university as neighbors.'],['매력을 알리다','Share Local Appeal'],['청계의 가게와 사람, 골목의 이야기를 더 넓게 전합니다.','We share the stories of Cheonggye’s shops, people, and streets more widely.'],['함께 성장하다','Grow Together'],['교육과 공동 프로젝트로 지속 가능한 상권을 가꿉니다.','We build a sustainable district through learning and joint projects.'],['상인회 상생 프로그램','Association Partnership Programs'],['함께 쓰고, 알리고, 성장합니다.','Use together, share together, grow together.'],['소비가 응원이 되고 참여가 동네의 기록이 되는 청계면상인회의 공동 프로젝트입니다.','Association projects turn local spending into support and participation into a record of the neighborhood.'],['상생스탬프','Community Stamp'],['참여 상가를 이용하고 도장을 모아 단골과 골목을 함께 키웁니다.','Visit participating shops, collect stamps, and grow loyal customers and the neighborhood together.'],['대학생과 주민이 만드는 짧은 영상으로 청계의 매력을 알립니다.','Short videos made by students and residents share Cheonggye’s appeal.'],['골목축제·상인교육','Street Festivals · Merchant Learning'],['행사, 교육과 교류를 통해 서로 배우고 함께 성장합니다.','Events, learning, and exchange help everyone learn and grow together.'],
['한눈에 보는','At a Glance'],['상권지도','Market Map'],['실제 도로와 지형을 바탕으로 승달산길·도림길·영산로와 목포대 후문 상권의 위치를 살펴보세요.','Explore Seungdalsan-gil, Dorim-gil, Yeongsan-ro, and the Mokpo National University back-gate district on a real street and terrain map.'],['표시 상가','Shown Shops'],['정회원','Full Members'],['준회원','Associate Members'],['상권 중심','District Center'],['무안군 · 청계면 중심','Muan · Central Cheonggye'],['오늘 청계에서 뭐 먹지?','What should I eat in Cheonggye today?'],['오늘 한 곳을 골라드리고, 상인이 공개한 혜택도 함께 보여드려요.','We pick one place for today and show offers published by merchants.'],['다시 추천','Pick Again'],['오늘의 한 곳','Today’s Pick'],['청계에서 한 곳을 고르는 중','Choosing a place in Cheonggye'],['잠시만 기다려 주세요.','Please wait a moment.'],['오늘 혜택 있는 곳','Places with Offers Today'],['등록된 혜택을 확인하고 있습니다.','Checking current offers.'],['지금 공개된 오늘의 혜택은 없습니다. 점포 운영자가 등록하면 자동으로 표시됩니다.','There are no public offers right now. New merchant offers will appear automatically.'],['지금 청계에서','Right Now in Cheonggye'],['시간대와 목적에 맞는 세 곳을 골라드려요.','We pick three places for your time and purpose.'],['🍚 점심','🍚 Lunch'],['☕ 카페','☕ Café'],['🌙 저녁','🌙 Dinner'],['🛍 생활','🛍 Everyday'],['전체','All'],['전체업종','All Categories'],['음식','Food'],['카페','Cafés'],['생활','Everyday'],['문화·서비스','Culture · Services'],['오늘 혜택만','Offers Today'],['상가 목록','Shop List'],['목록을 선택하면 상세정보가 함께 바뀝니다.','Select a shop to update its details.'],['선택 상가 정보','Selected Shop'],['청계 상권 둘러보기','Explore Cheonggye'],['목록이나 지도에서 상가를 선택하면 회원 구분과 기본 정보를 확인할 수 있습니다.','Select a shop from the list or map to see membership and basic information.'],['지도 표시 기준','About Map Positions'],['배경지도는 OpenStreetMap의 실제 도로·지형 데이터를 사용합니다. 도로명주소가 있는 점포는 해당 도로 구간을 기준으로 개략 배치하고, 상세주소가 없는 점포는 청계면 상권 중심에 ‘개략 위치’로 표시합니다. 최종 방문 위치는 등록주소의 네이버지도·카카오 길찾기로 확인해 주세요.','The base map uses real OpenStreetMap road and terrain data. Shops with street addresses are placed approximately along the relevant road; shops without detailed addresses are shown near the district center as approximate locations. Confirm the final destination using the registered address in your preferred map service.'],
['공식 자료실','Official Archive'],['회원·운영, 지원사업, 도시재생, 축제·공청회, 소통채널을 필요한 만큼만 빠르게 찾아보세요.','Quickly find membership and operations records, support programs, urban regeneration, festivals and hearings, and communication channels.'],['회원·운영','Membership · Operations'],['지원사업','Support Programs'],['도시재생','Urban Regeneration'],['축제·공청회','Festivals · Hearings'],['소통채널','Communication'],['공식 자료를 불러오는 중입니다.','Loading official information.'],['청계면 목대후문','Cheonggye · Mokpo National Univ. Back Gate'],['골목형상점가','Local Street Shopping District'],['공식 등록자료에 등재된 72개 상가를 빠짐없이 확인할 수 있습니다.','View all 72 shops listed in the official registration record.'],['공식 등록상가','Officially Registered Shops'],['72개 상가','72 Shops'],['번호','No.'],['상가명','Shop'],['업종','Category'],['주소','Address'],['공개 대표전화','Public Phone'],['위치','Location'],['기준: 목대후문 골목형상점가 공식 등록자료(2026.07.29) · 공식 등록상가 72개소, 공개 대표전화 확인 36개·미확인 36개입니다. 전화번호는 변경될 수 있으니 중요한 연락 전 연결 여부를 확인해 주세요.','Source: official Mokpo National University Back Gate street-shopping-district record (2026-07-29). 72 registered shops; 36 public phone numbers confirmed and 36 unconfirmed. Phone numbers may change, so verify before important calls.'],
['소상공인을 위한','For Small Businesses'],['실시간 상권소식','Live Market Updates'],['지원사업, 교육, 판로, 행사·이벤트 공고를','Support, training, sales channels, events, and notices'],['관공서와 공식기관 출처 링크로 전합니다.','with links to government and official sources.'],['상인회 공지사항','Association Notices'],['청계면상인회가 직접 전하는 일정, 회원 안내와 긴급 공지입니다.','Schedules, member guidance, and urgent notices directly from the association.'],['공지 작성','Write Notice'],['분류','Category'],['공지','Notice'],['회의','Meeting'],['행사','Event'],['회원','Member'],['긴급','Urgent'],['제목','Title'],['내용','Content'],['상단 고정','Pin to Top'],['공지 등록','Publish Notice'],['공지사항을 불러오는 중입니다.','Loading notices.'],['자금·대출','Funding · Loans'],['교육·컨설팅','Training · Consulting'],['판로·마케팅','Sales · Marketing'],['상권행사','District Events'],['무안·지역','Muan · Local'],['목포대소식','University News'],['안전·환경','Safety · Environment'],['최신 공개 소식을 불러오는 중입니다.','Loading the latest public updates.'],['새로고침','Refresh'],['우리 가게 이벤트를 알려주세요','Tell Us About Your Shop Event'],['할인, 신메뉴, 공연, 채용 등 상권의 직접 소식을 보내주시면 확인 후 공유합니다.','Send us shop news such as discounts, new menus, performances, or hiring. We will review and share it.'],['소식 제보','Submit News'],
['실시간 소통 공간','Live Connection Space'],['어디서든 함께하는','Together from Anywhere'],['정기회의와 온라인 설명회는 Jitsi에서,','Regular meetings and online briefings are on Jitsi,'],['현장 행사와 상권 소식은 유튜브 라이브에서 만나보세요.','while field events and district news are on YouTube Live.'],['실시간 화상','Live Video Meeting'],['홈페이지 안에서 이름을 입력하고 회의에 참여할 수 있습니다. 카메라와 마이크는 참여자가 직접 허용할 때만 사용됩니다.','Enter your name and join the meeting on this page. Camera and microphone are used only after you grant permission.'],['회의실을 새 창에서 열기 ↗','Open meeting in a new window ↗'],['유튜브 방송','YouTube Broadcast'],['청계면상인회 공식 유튜브 채널의 현재 라이브 방송을 홈페이지에서 바로 시청하세요. 방송이 없을 때는 대기 화면이 표시됩니다.','Watch the association’s current YouTube live stream here. A clear standby state appears when no stream is active.'],['유튜브에서 보기 ↗','Open on YouTube ↗'],
['회원 전용 소통을','Member Communication'],['Google로 시작하세요.','Start with Google.'],['Google 계정으로 EKODI 통합인증센터에 로그인한 뒤 청계면상인회 회원 기능을 이용할 수 있습니다.','Sign in with your Google account through EKODI Central Authentication to use association member features.'],['Google로 계속하기','Continue with Google'],['처음 로그인하면 준회원으로 접수되며, 상인회 확인 후 정회원 권한이 부여됩니다.','First-time users are registered as associate members. Full-member access is granted after association review.'],['회원 안내 및','Member Guide &'],['공지사항','Notices'],['함께 지키면 더 편안하고 활기찬 청계면 상권이 됩니다.','Following these shared guidelines helps keep Cheonggye comfortable and lively.'],['온라인 회원가입 신청서','Online Membership Application'],['가입 및 회비 안내','Membership & Dues'],['주변 상인에게 정회원 가입을 추천해 주세요.','Please invite neighboring merchants to join as full members.'],['신규회원','New Member'],['가입비 5만원, 연회비 6만원','Joining fee ₩50,000 · Annual dues ₩60,000'],['기존회원','Existing Member'],['연회비 6만원(월 단위 구분 없음)','Annual dues ₩60,000 (not prorated monthly)'],['회비 납부계좌','Dues Account'],['신한은행 100-037-318876','Shinhan Bank 100-037-318876'],['신규가입자는 신청서 작성 후 간단한 자기소개를 부탁드립니다.','New applicants are asked to provide a brief introduction after submitting the application.'],['회원 소통방 이용안내','Member Chat Guidelines'],['프로필을','Set your profile to'],['상가명/성명','Shop Name / Your Name'],['으로 변경해 주세요.','for easy identification.'],['개별 홍보글은 임원을 통해 게시해 주세요.','Please route individual promotional posts through an association officer.'],['유용한 정보공유는 1일 1회 자유롭게 해 주세요.','Useful information may be shared freely, up to once per day.'],['단체대화방의 단순 답장은 이모티콘 체크를 이용해 주세요.','For simple acknowledgements in group chat, please use an emoji reaction.'],['상권 생활 안내','District Living Guide'],['상가별 쓰레기 배출시간','Shop Waste Disposal Time'],['오전 8시 이전 또는 오후 6시 이후','Before 8 AM or after 6 PM'],['상시 신고','Anytime Reporting'],['안전신문고·국민신문고 앱','Safety e-Report · e-People apps'],['주간 주차단속','Daytime Parking Enforcement'],['야간 문의','Nighttime Inquiry'],['상인회 운영에 관한 자세한 내용은','For detailed association operations, see'],['에서 확인해 주세요.','for more information.'],
['청계의 내일에','For Cheonggye’s Tomorrow'],['함께해 주세요.','Join Us.'],['가입안내 보기','View Membership Guide'],['정회원 기준','Full Member Eligibility'],['청계면 상권에서 사업을 직접 영위하고 정관과 회원 의무를 이행하는 상인입니다.','A merchant who directly operates a business in the Cheonggye district and follows the bylaws and member obligations.'],['신규회원 회비','New Member Dues'],['가입비 5만원과 연회비 6만원을 납부합니다.','Joining fee ₩50,000 plus annual dues ₩60,000.'],['기존회원 회비','Existing Member Dues'],['연회비 6만원이며 월 단위로 구분하지 않습니다.','Annual dues are ₩60,000 and are not prorated monthly.'],['납부 계좌','Payment Account'],['가입 절차','Application Process'],['온라인 신청서 작성 → 간단한 자기소개 → 임원 협의·심사 → 가입 확정 순서로 진행합니다.','Online application → brief introduction → officer review → membership confirmation.'],['정관과 자세한 내용 확인하기 →','View bylaws and details →'],['회원가입 신청은 청계면상인회 홈페이지 안에서 진행합니다. 로그인 후 상가와 신청자 정보를 입력하면 임원진이 확인하여 안내드립니다.','Membership applications are completed on the association website. Sign in, enter shop and applicant information, and the officers will review and respond.'],['온라인 가입신청서 작성하기','Complete Online Application'],['전화 문의','Phone Inquiry'],['신청서에는 상가 및 신청자 정보를 정확히 입력해 주세요. 제출된 개인정보는 가입 심사 목적으로만 사용됩니다.','Enter shop and applicant information accurately. Submitted personal data is used only for membership review.'],['홈페이지에서 바로','Right on This Website'],['회원가입 신청','Apply for Membership'],['외부 양식으로 이동하지 않고 청계면상인회 회원 페이지에서 로그인, 신청, 승인 확인까지 이어집니다.','Sign in, apply, and check approval on the association member page without leaving for an external form.'],['회원가입 신청 시작','Start Membership Application'],['상가명, 업종, 사업장 주소, 사업자등록번호와 신청자 정보를 홈페이지 안에서 안전하게 제출할 수 있습니다.','Securely submit shop name, category, business address, business registration number, and applicant information on this website.'],['정회원 신청 페이지로 이동','Go to Full-Member Application'],['제출된 개인정보는 회원가입 심사와 연락 목적으로만 사용됩니다.','Submitted personal data is used only for membership review and contact.'],
['사람과 지역을 잇는 연결형 플랫폼','A platform connecting people and places'],['목포대 후문과 청계면을 잇는 생활상권','A local district connecting Cheonggye and Mokpo National University'],['전라남도 무안군 청계면 · 목포대 후문 상권','Cheonggye, Muan, Jeollanam-do · Mokpo National University Back Gate District'],['© 2026 청계면상인회. All rights reserved.','© 2026 Cheonggye Merchants Association. All rights reserved.']
];

const ATTR_ROWS=[
['언어 선택','Choose language'],['메뉴 열기','Open menu'],['주요 메뉴','Main navigation'],['청계면상인회 홈','Cheonggye Merchants Association home'],['청계 상권 현재 현황','Current Cheonggye market status'],['청계 골목의 활기찬 풍경을 표현한 그래픽','Illustration of lively Cheonggye streets'],['청계면상인회 빠른 시작','Cheonggye Merchants Association quick start'],['청계면상인회 주요 가치','Cheonggye Merchants Association values'],['청계면상인회 임원 및 운영진','Association leadership'],['청계면 상권 현황','Cheonggye market status'],['오늘 혜택 있는 상가','Shops with offers today'],['상황별 추천','Recommendations by situation'],['회원 구분','Membership type'],['업종 선택','Category'],['상가 검색 결과','Shop search results'],['지도에 표시된 상가 목록','Shops shown on map'],['청계면 상권의 실제 도로와 상가 위치를 보는 지도','Map showing real roads and shop locations in Cheonggye'],['회원 구분','Membership type'],['자료 분류','Resource category'],['모바일 빠른 메뉴','Mobile quick menu'],['상가명 또는 업종 검색','Search shop name or category'],['자료실 검색','Search official archive'],['제목','Title'],['내용','Content']
];
const TEXT_EN=new Map(TEXT_ROWS);
const EXTRA_TEXT_ROWS=[
  ['오늘 한 곳을 골라드려요. 상인이 혜택을 등록하면 여기에 바로 나타납니다.','We pick one place for today. Merchant offers appear here automatically.'],
  ['잠시 쉬어갈 카페 세 곳을 골라봤어요.','Here are three cafés for a short break.'],
  ['점심에 들르기 좋은 곳을 골라봤어요.','Here are three good places for lunch.'],
  ['저녁에 들르기 좋은 곳을 골라봤어요.','Here are three good places for dinner.'],
  ['생활에 필요한 곳을 골라봤어요.','Here are three useful everyday places.'],
  ['청계면상인회 정회원 상가입니다.','This shop is a full member of the Cheonggye Merchants Association.'],
  ['지역 안에서 소비가 순환할 수 있도록 방문과 관심으로 함께해 주세요.','Visit and support local shops so spending can circulate within the community.'],
  ['실제 도로 기반 개략 위치에서 가까운 순으로 보여드립니다.','Shown in order of proximity using approximate positions based on real roads.'],
  ['상세 좌표가 확인되지 않아 해당 골목·상권 중심에 개략 표시했습니다.','Exact coordinates are unavailable, so this shop is shown approximately near its street or district center.'],
  ['정확한 건물 위치는 아래 길찾기로 확인해 주세요.','Use the directions links below to confirm the exact building location.'],
  ['자료실 연결을 준비하고 있습니다.','Connecting to the official archive.'],['잠시 후 다시 확인해 주세요.','Please try again shortly.'],
  ['공지사항을 불러오지 못했습니다.','Notices could not be loaded.'],['공식 출처 연결을 다시 확인하고 있습니다.','Rechecking connections to official sources.'],
  ['지금은 새 공고를 불러오지 못했습니다.','New public notices could not be loaded right now.'],
  ['Google로 무료 로그인','Free Sign in with Google'],['Google 로그인만으로 무료회원 계정을 시작할 수 있습니다.','Start a free member account with Google sign-in only.'],
  ['정회원 신청 시에만 추가정보를 받습니다.','Additional information is requested only when applying for full membership.'],
  ['가입하기를 누르면 먼저 Google 계정으로 무료 로그인합니다.','Select Join to sign in free with your Google account first.'],
  ['이후 정회원 신청을 선택할 때만 상가·사업자 등 추가정보를 입력합니다.','Shop and business details are requested only if you later apply for full membership.'],
  ['Google 로그인 후 정회원 신청','Apply for Full Membership after Google Sign-in'],['무료 로그인 단계에서는 Google 계정만 확인합니다.','The free sign-in step checks only your Google account.'],
  ['정회원 신청 단계에서 필요한 추가정보를 입력해 주세요.','Enter the additional information only at the full-member application step.'],
  ['Google 로그인 후 신청','Sign in with Google, then Apply'],['기존 Google 설문은 기본 가입 절차에서 사용하지 않습니다.','The old Google Form is not used for the standard sign-up flow.'],
  ['정회원 심사에 필요한 정보만 별도 신청 화면에서 받습니다.','Only information needed for full-member review is collected on the dedicated application screen.'],
  ['관리자 운영관리','Admin Operations'],['공개 대표전화 미확인','Public phone not confirmed'],['네이버지도 ↗','Naver Map ↗'],['길찾기 ↗','Directions ↗'],
  ['골목 구분','Street Area'],['지도 위치 기준','Map Position Basis'],['상권 중심 개략 위치','Approximate District-Center Location'],['같은 골목에서 함께 보기','See Nearby on the Same Street']
];
for(const [ko,en] of EXTRA_TEXT_ROWS)TEXT_EN.set(ko,en);
for(const [ko,en] of [
  ['자료실 연결을 준비하고 있습니다. 잠시 후 다시 확인해 주세요.','Connecting to the official archive. Please try again shortly.'],
  ['상세 좌표가 확인되지 않아 해당 골목·상권 중심에 개략 표시했습니다. 정확한 건물 위치는 아래 길찾기로 확인해 주세요.','Exact coordinates are unavailable, so this shop is shown approximately near its street or district center. Use the directions links below to confirm the exact building location.'],
  ['실제 도로 지도를 기준으로 위치를 표시했습니다. 건물 출입구 등 최종 방문 위치는 아래 길찾기로 확인해 주세요.','The position is based on the real street map. Use the directions links below to confirm the final entrance and destination.'],
  ['Google 로그인만으로 무료회원 계정을 시작할 수 있습니다. 정회원 신청 시에만 추가정보를 받습니다.','Start a free member account with Google sign-in only. Additional information is requested only when applying for full membership.'],
  ['가입하기를 누르면 먼저 Google 계정으로 무료 로그인합니다. 이후 정회원 신청을 선택할 때만 상가·사업자 등 추가정보를 입력합니다.','Select Join to sign in free with your Google account first. Shop and business details are requested only if you later apply for full membership.'],
  ['무료 로그인 단계에서는 Google 계정만 확인합니다. 정회원 신청 단계에서 필요한 추가정보를 입력해 주세요.','The free sign-in step checks only your Google account. Enter additional information only at the full-member application step.'],
  ['기존 Google 설문은 기본 가입 절차에서 사용하지 않습니다. 정회원 심사에 필요한 정보만 별도 신청 화면에서 받습니다.','The old Google Form is not used for standard sign-up. Only information needed for full-member review is collected on the dedicated application screen.'],
  ['Google 무료 로그인이 확인되었습니다. 정회원으로 신청할 때만 상가·사업자 등 추가정보를 입력합니다.','Your free Google sign-in is confirmed. Shop and business details are requested only when you apply for full membership.'],
  ['정회원 신청 화면 →','Full-Member Application →'],['Google 로그인 후 신청 →','Sign in with Google, then Apply →'],['잠시 후 새로고침해 주세요.','Please refresh again shortly.'],
  ['청계면 생활상권','Cheonggye Local District'],['먹고 머무는 골목','A street to eat and stay'],['음식·외식','Food & Dining'],['상권','District']
])TEXT_EN.set(ko,en);
for(const [ko,en] of [
  ['청계면상인회 정회원 상가입니다. 지역 안에서 소비가 순환할 수 있도록 방문과 관심으로 함께해 주세요.','This shop is a full member of the Cheonggye Merchants Association. Visit and support local shops so spending can circulate within the community.'],
  ['준회원 상가로 등록된 기본 안내입니다.','This is the basic information for a registered associate-member shop.'],
  ['공지사항을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.','Notices could not be loaded. Please try again shortly.'],
  ['대표메뉴','Featured Menu'],['영업안내','Business Hours'],['작성 닫기','Close Editor'],['등록되었습니다.','Published.'],['공지를 등록하고 있습니다.','Publishing notice.'],['로그인 후 다시 시도해 주세요.','Please sign in and try again.'],['등록 권한을 확인해 주세요.','Please check your publishing permission.']
])TEXT_EN.set(ko,en);
const TOKEN_ROWS=[
  ['정회원','Full Member'],['준회원','Associate Member'],['추천','Pick'],['표시 상가','Shown Shops'],['음식·외식','Food & Dining'],['음식점','Restaurant'],['한식','Korean Food'],['치킨·피자','Chicken · Pizza'],['카페','Café'],['의료','Medical'],['미용','Beauty'],['편의점','Convenience Store'],['생활용품','Household Goods'],['문화·서비스','Culture · Services'],['주점','Pub'],['금융','Finance'],['환경서비스','Environmental Services'],['행정서비스','Administrative Services'],['광고·인쇄','Advertising · Printing'],['패스트푸드','Fast Food'],['생활체육','Recreation'],['꽃·식물','Flowers · Plants'],['베이커리','Bakery'],['일식','Japanese Food'],['횟집','Sashimi'],['주방·인테리어','Kitchen · Interior'],['기관','Institution'],['교육','Education'],['디자인','Design'],['분식','Snack Food'],['문구','Stationery'],['사진','Photography'],['마트','Grocery'],['서점','Bookstore'],['노래방','Karaoke'],['서비스','Services']
];
const TOKEN_EN=new Map(TOKEN_ROWS);
const ATTR_EN=new Map(ATTR_ROWS);
const REVERSE_TEXT=new Map([...TEXT_ROWS,...EXTRA_TEXT_ROWS].map(([ko,en])=>[en,ko]));
const REVERSE_ATTR=new Map(ATTR_ROWS.map(([ko,en])=>[en,ko]));
const textSources=new WeakMap();
const attrSources=new WeakMap();

function normalize(value){
  const raw=String(value||'').trim();
  if(SUPPORTED.has(raw))return raw;
  const lower=raw.toLowerCase();
  if(lower==='ko'||lower.startsWith('ko-'))return'ko-KR';
  if(lower==='en'||lower.startsWith('en-'))return'en';
  if(lower==='zh'||lower.startsWith('zh-'))return'zh-CN';
  if(lower==='ja'||lower.startsWith('ja-'))return'ja';
  if(lower==='vi'||lower.startsWith('vi-'))return'vi';
  if(lower==='ne'||lower.startsWith('ne-'))return'ne';
  return'';
}
function controlLocale(locale){return locale==='ko-KR'?'ko':locale;}
function isReady(locale){return READY.has(locale)&&publishedReady.has(locale);}
function syncLanguageOptions(){if(!language)return;for(const option of language.options){const locale=normalize(option.value);if(!locale||!READY.has(locale)||locale==='ko-KR')continue;option.disabled=!publishedReady.has(locale);option.dataset.ekodiPublication=publishedReady.has(locale)?'published':'hidden';}}
async function refreshPublicationStatus(){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1800);try{const response=await fetch(PUBLICATION_STATUS_URL,{cache:'no-store',signal:controller.signal,headers:{accept:'application/json'}});if(!response.ok)throw new Error(`publication_status_${response.status}`);const data=await response.json(),next=new Set(['ko-KR']);for(const item of Array.isArray(data.languages)?data.languages:[])if(item?.public===true&&READY.has(normalize(item.locale)))next.add(normalize(item.locale));publishedReady=next;publicationKnown=true;publicationState='central-ledger';}catch{publishedReady=new Set(['ko-KR']);publicationKnown=false;publicationState='fail-closed';}finally{clearTimeout(timer);document.documentElement.dataset.ekodiI18nPublication=publicationState;syncLanguageOptions();}return publishedReady;}
function compact(value){return String(value||'').replace(/\s+/g,' ').trim();}
function preserveSpace(raw,value){
  const lead=String(raw).match(/^\s*/)?.[0]||'';
  const trail=String(raw).match(/\s*$/)?.[0]||'';
  return `${lead}${value}${trail}`;
}
function queryLocale(){try{return normalize(new URL(location.href).searchParams.get(QUERY_KEY));}catch{return'';}}
function readCookie(){try{const p=`${COOKIE_KEY}=`;const item=String(document.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(p));return normalize(item?decodeURIComponent(item.slice(p.length)):'');}catch{return'';}}
function readStorage(){try{return normalize(localStorage.getItem(LOCALE_KEY)||localStorage.getItem(LEGACY_KEY)||'');}catch{return'';}}
function clearLegacyGoogleTranslate(){for(const domain of ['',`.${location.hostname}`]){const suffix=domain?`;domain=${domain}`:'';document.cookie=`googtrans=;path=/;max-age=0${suffix};SameSite=Lax`;}}
function ensureNativeBoundary(){let meta=document.head.querySelector('meta[name="google"][content="notranslate"]');if(!meta){meta=document.createElement('meta');meta.name='google';meta.content='notranslate';document.head.append(meta);}document.documentElement.dataset.ekodiBrowserTranslation='native-i18n';clearLegacyGoogleTranslate();}
function persist(locale){try{localStorage.setItem(LOCALE_KEY,locale);localStorage.removeItem(LEGACY_KEY);}catch{}try{document.cookie=`${COOKIE_KEY}=${encodeURIComponent(locale)};path=/;max-age=31536000;SameSite=Lax${location.protocol==='https:'?';Secure':''}`;}catch{}}
function setText(selector,value){const node=document.querySelector(selector);if(node&&node.textContent!==value)node.textContent=value;}
function updateMeta(locale){const c=COPY[locale]||COPY['ko-KR'];document.title=c.title;const meta=document.querySelector('meta[name="description"]');if(meta)meta.content=c.description;}
function applyCopy(locale){
  const c=COPY[locale]||COPY['ko-KR'];
  document.documentElement.lang=locale;
  document.documentElement.dataset.ekodiLocale=locale;
  document.documentElement.dataset.ekodiI18nVersion=String(VERSION);
  document.documentElement.dataset.ekodiI18nState='ready';
  updateMeta(locale);
  setText('.header nav a[href="#about"]',c.about);setText('.header nav a[href="#market-map"]',c.map);setText('.header nav a[href="#resources"]',c.resources);setText('.header nav a[href="#news"]',c.news);setText('.header nav a[href="#live"]',c.live);setText('.header nav [data-central-auth]',c.login);setText('.header nav [data-member-apply]',c.join);
  setText('.live-head > div > span:not(.live-dot)',c.liveKicker);setText('.live-head > p',c.liveIntro);setText('.meeting-room h3',c.meetingTitle);setText('.meeting-room .live-card-copy p',c.meetingBody);setText('.meeting-room .live-fallback',c.meetingOpen);setText('.youtube-live h3',c.youtubeTitle);setText('.youtube-live .live-card-copy p',c.youtubeBody);setText('.youtube-live .live-fallback',c.youtubeOpen);
  const brand=document.querySelector('.header .brand');if(brand)brand.setAttribute('aria-label',c.home);if(language)language.setAttribute('aria-label',c.language);
}
function dynamicSource(value){
  const now=compact(value);if(!/[가-힣]/.test(now))return'';
  if(/^\d+\s*(곳|개)$/.test(now)||/정회원|준회원|추천\s*\d+|표시 상가|총\s*\d+개|공개 대표전화|골목 구분|지도 위치 기준|상권 중심 개략 위치|같은 골목에서/.test(now))return now;
  return'';
}
function translateDynamic(source){
  let value=source;
  for(const [ko,en] of TOKEN_EN)value=value.split(ko).join(en);
  value=value.replace(/(\d+)\s*곳/g,'$1 places').replace(/총\s*(\d+)\s*개/g,'Total $1').replace(/(\d+)\s*개/g,'$1');
  return value;
}
function sourceForText(node){
  const now=compact(node.nodeValue);const existing=textSources.get(node);
  if(existing){
    const expected=activeLocale==='en'?(TEXT_EN.get(existing)||translateDynamic(existing)):existing;
    if(now===compact(expected)||now===compact(existing))return existing;
  }
  const source=TEXT_EN.has(now)?now:(REVERSE_TEXT.get(now)||dynamicSource(now));
  if(source)textSources.set(node,source);else if(existing)textSources.delete(node);
  return source||'';
}
function sourceForAttr(node,name){
  let bag=attrSources.get(node);if(!bag){bag={};attrSources.set(node,bag);}if(bag[name])return bag[name];
  const now=compact(node.getAttribute(name));const source=ATTR_EN.has(now)?now:REVERSE_ATTR.get(now);if(source)bag[name]=source;return source||'';
}
function translateTextNode(node){
  const parent=node.parentElement;if(!parent||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(parent.tagName)||(parent.tagName==='OPTION'&&parent.closest('#siteLanguage')))return;
  const source=sourceForText(node);if(!source)return;
  const desired=activeLocale==='en'?(TEXT_EN.get(source)||translateDynamic(source)):source;
  if(compact(node.nodeValue)!==compact(desired))node.nodeValue=preserveSpace(node.nodeValue,desired);
}
function translateElementAttrs(node){
  if(!(node instanceof Element))return;
  for(const name of ['aria-label','placeholder','title']){
    if(!node.hasAttribute(name))continue;
    const source=sourceForAttr(node,name);if(!source)continue;
    const desired=activeLocale==='en'?(ATTR_EN.get(source)||source):source;
    if(compact(node.getAttribute(name))!==compact(desired))node.setAttribute(name,desired);
  }
}
function translateTree(root=document.body){
  if(!root)return;
  if(root.nodeType===Node.TEXT_NODE)translateTextNode(root);
  if(root.nodeType===Node.ELEMENT_NODE)translateElementAttrs(root);
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))translateTextNode(node);
  if(root.querySelectorAll)for(const el of root.querySelectorAll('[aria-label],[placeholder],[title]'))translateElementAttrs(el);
}
function scheduleTranslate(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;translateTree(document.body);});}
function installObserver(){if(observer||!document.body)return;observer=new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')translateTextNode(record.target);for(const node of record.addedNodes||[])translateTree(node);if(record.type==='attributes')translateElementAttrs(record.target);}scheduleTranslate();});observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title']});}
function installPreparingStyle(){if(document.getElementById('cgma-i18n-preparing-style'))return;const style=document.createElement('style');style.id='cgma-i18n-preparing-style';style.textContent='.cgma-i18n-preparing{position:fixed;z-index:2147483640;left:50%;top:max(20px,env(safe-area-inset-top));transform:translateX(-50%);width:min(92vw,520px);padding:14px 18px;border:1px solid rgba(20,63,53,.2);border-radius:16px;background:#fff;color:#143f35;box-shadow:0 18px 55px rgba(0,0,0,.18);font:600 14px/1.55 system-ui,-apple-system,"Noto Sans KR",sans-serif}.cgma-i18n-preparing strong{display:block;margin-bottom:3px;font-size:15px}.cgma-i18n-preparing p{margin:0;color:#52675d}';document.head.append(style);}
function showPreparing(locale,{unpublished=false}={}){
  document.documentElement.dataset.ekodiI18nVersion=String(VERSION);
  document.documentElement.dataset.ekodiI18nState=unpublished?'fallback-unpublished':'fallback-pending';
  installPreparingStyle();document.querySelector('.cgma-i18n-preparing')?.remove();const copy=unpublished?(UNPUBLISHED[locale]||{title:'This language is not currently published',body:'Returning to Korean.'}):(PREPARING[locale]||{title:'Translation is being prepared',body:'Returning to Korean.'});const box=document.createElement('div');box.className='cgma-i18n-preparing';box.setAttribute('role','status');box.setAttribute('aria-live','polite');box.innerHTML=`<strong>${copy.title}</strong><p>${copy.body}</p>`;document.body.append(box);clearTimeout(fallbackTimer);fallbackTimer=setTimeout(()=>{box.remove();apply('ko-KR',{save:true,emit:true});},1600);
}
function requestLocale(value,{save=true,emit=true}={}){
  const locale=normalize(value)||'ko-KR';
  if(!READY.has(locale)){if(language)language.value=controlLocale(locale);showPreparing(locale);return activeLocale;}
  if(!isReady(locale)){showPreparing(locale,{unpublished:true});return activeLocale;}
  return apply(locale,{save,emit});
}
function apply(value,{save=true,emit=true}={}){
  const locale=isReady(normalize(value))?normalize(value):'ko-KR';
  activeLocale=locale;if(save)persist(locale);if(language&&language.value!==controlLocale(locale))language.value=controlLocale(locale);applyCopy(locale);translateTree(document.body);scheduleTranslate();if(emit)window.dispatchEvent(new CustomEvent('ekodi:locale-change',{detail:{locale,version:VERSION,source:'cgma-native-i18n'}}));return locale;
}
function homeUrl(){const url=new URL(location.href);url.search='';url.hash='';url.pathname=(url.hostname==='ekodi.kr'||url.hostname==='www.ekodi.kr')?'/cgma/':'/';return url;}
function bindBrandHome(){const brand=document.querySelector('.header .brand');if(!brand)return;brand.dataset.ekodiHeaderHome='cgma';brand.href=homeUrl().toString();brand.addEventListener('click',event=>{const target=homeUrl(),here=new URL(location.href);here.search='';here.hash='';if(here.origin===target.origin&&here.pathname.replace(/\/+$/,'/')===target.pathname.replace(/\/+$/,'/')){event.preventDefault();window.scrollTo({top:0,left:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});try{history.replaceState(history.state,'',target.pathname+location.search);}catch{}}});}
async function boot(){ensureNativeBoundary();bindBrandHome();await refreshPublicationStatus();const initial=queryLocale()||readCookie()||readStorage()||normalize(document.documentElement.lang)||normalize(navigator.language)||'ko-KR';apply(isReady(initial)?initial:'ko-KR',{save:true,emit:true});installObserver();if(initial&&!READY.has(initial))showPreparing(initial);else if(initial&&READY.has(initial)&&!isReady(initial))showPreparing(initial,{unpublished:true});}
language?.addEventListener('change',()=>requestLocale(language.value));
window.addEventListener('ekodi:locale-change',event=>{if(event.detail?.source==='cgma-native-i18n')return;const locale=normalize(event.detail?.locale);if(locale)requestLocale(locale,{save:true,emit:false});});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.CGMANativeI18n=Object.freeze({version:VERSION,supported:[...SUPPORTED],ready:[...READY],getLocale:()=>activeLocale,setLocale:locale=>requestLocale(locale),refresh:scheduleTranslate,refreshPublication:refreshPublicationStatus,health:()=>({version:VERSION,locale:activeLocale,state:document.documentElement.dataset.ekodiI18nState||'unknown',publicationState,publishedReady:[...publishedReady],browserTranslation:document.documentElement.dataset.ekodiBrowserTranslation||'',supported:[...SUPPORTED],ready:[...READY]})});
})();
