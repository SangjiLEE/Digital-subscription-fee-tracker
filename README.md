# Digital Sub Fee Tracker

넷플릭스부터 AI 구독까지 — 매달 나가는 디지털 구독료와 갱신 일정을 한눈에 보는 웹 서비스.

**라이브**: https://subfolio-app.web.app

## 현재 기능 (알파)

- **Google 로그인** — One Tap(FedCM) 1순위, 팝업 → 리다이렉트 폴백. 데이터는 Firestore `users/{uid}/`에 본인만 접근
- **구독 관리** — 등록(카탈로그 참고가 프리필) · 수정(행 탭) · 삭제(×). 비로그인은 데모 데이터
- **사진 자동 인식** — 영수증·구독 화면 캡처를 올리면 Gemini가 서비스명/금액/통화/주기/카테고리/갱신일 추출 → 확인 카드 → 즉시 등록 또는 편집 (Firebase AI Logic, 이미지는 저장하지 않음)
- **홈 대시보드** — 월 총액, 월별 스택 차트(과거 실선/예정 빗금 + 추세선 + 전월 대비 증감), 30일 내 갱신 리스트, 3일 내 갱신 앱 내 알림 배너
- **실환율** — Frankfurter(ECB) 일 1회 페치, 24h 캐시, 실패 시 고정값 폴백. ₩/¥/$ 표시 통화 전환
- **다국어** — 한국어 · 日本語 · English (설정에서 전환, 기기 저장)
- **가격 참조 지역** — JP/KR/US 별 카탈로그 참고가

"준비 중": 주간 요약 메일 · 메일 포워딩 감지 (발송/수신 서버 필요 — Blaze 전환 후)

## 개발

```bash
npm install
npm run dev        # http://localhost:3000
```

`.env.local`에 `NEXT_PUBLIC_FIREBASE_*` 6개 키 필요 (Firebase 콘솔 → 프로젝트 설정 → 웹 앱).

## 배포

`main` push → GitHub Actions가 빌드 후 Firebase Hosting에 자동 배포. PR은 프리뷰 채널.
빌드 env는 GitHub Secrets(`NEXT_PUBLIC_*`)에서 주입.

수동 배포: `npm run build && firebase deploy --only hosting`

## 구조

```
app/
  page.tsx           홈 — 총액·차트·갱신 리스트·알림 배너
  list/page.tsx      목록 — 사진 인식, 카테고리 그룹(월 환산 소계), 일회성 분리
  settings/page.tsx  설정 — 통화·언어·가격지역 드롭다운, 갱신 알림 토글
  layout.tsx         공통 셸 (Lang/Auth/Store Provider, 헤더, 탭내비, 모달)
components/
  ScanBanner.tsx     사진 업로드 → Gemini 인식 카드 → 등록/편집
  AddModal.tsx       등록·수정 모달 — 지역별 카탈로그 참고가 프리필
  MonthChart.tsx     스택 막대 + 추세선 (y축 눈금, CVD 검증 팔레트)
  ...
lib/
  firebase.ts        Firebase 초기화 (authDomain은 반드시 사이트 도메인)
  auth.tsx           One Tap → 팝업 → 리다이렉트 3단 로그인
  store.tsx          Firestore 실시간 구독 + 환경설정(localStorage)
  scan.ts            Gemini 이미지 추출 (gemini-flash-latest, responseSchema)
  monthly.ts         월별 집계·다음 결제일 계산 (D7 월말 클램프)
  fx.ts              ECB 환율 (24h 캐시, 폴백)
  i18n.tsx           ko/ja/en 문구 사전 — UI 문구는 전부 여기에
data/catalog-seed.json  카탈로그 시드 (KR/JP/US)
docs/schema.md          데이터 모델·설계 결정(D1~D13)
```

## 로드맵

1. **charges 원장** — 실제 결제 이력 기록 (과거 월 추정치 → 실측 전환, 환율 스냅샷 박제)
2. **FX 마크업** — 결제수단별 해외결제 수수료 반영 (차별화 포인트: 실제 청구액 기준 총액)
3. **전체 Subscription 스키마 마이그레이션** — lib/types.ts ↔ docs/schema.md 정합
4. **App Check 정식 도입** — reCAPTCHA v3 (스캔 남용 방지)
5. **메일 파이프라인** — Blaze 전환 후 주간 요약 메일 + 영수증 포워딩 감지

설계 결정의 근거는 `docs/schema.md`의 D1~D13 표를 참조.
