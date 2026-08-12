# 청계면상인회 홈페이지

구글드라이브의 상인회 자료(정회원 현황, 업종별 상가명단, 상생스탬프 운영안, 영상 공모전 사업개요, 상권활성화 일정)를 참고해 만든 정적 홈페이지입니다.

## 실행

`index.html`을 브라우저에서 열거나 이 폴더에서 간단한 정적 서버를 실행하세요.

```powershell
python -m http.server 8080
```

그 후 `http://localhost:8080`으로 접속합니다.

## 공개 전 확인

- 푸터 문의 이메일을 상인회 공식 연락처로 교체
- 실제 공개 동의를 받은 가게 정보만 최종 노출
- 상생스탬프 참여 링크와 공식 SNS 채널 연결
- 행사 일정 확정 후 날짜 업데이트

## 배포

`main` 브랜치가 갱신되면 GitHub Actions가 기존 Cloudflare Pages 프로젝트 `cheonggye-market`에 자동 배포합니다.

필요한 GitHub Repository Secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

배포 후 `/`, `/ai`, `/member`, `/store-admin` 주요 경로를 자동 헬스체크합니다.
