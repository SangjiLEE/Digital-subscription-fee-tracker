# Digital Subscription Fee Tracker (Subfolio)

넷플릭스부터 AI 구독까지 — 매달 나가는 디지털 구독료와 갱신 일정을 한눈에 보는 웹 서비스.

## 시작하기

```bash
npm install
npm run dev        # http://localhost:3000
```

배포: 레포를 Vercel에 연결하면 `git push`마다 자동 배포됩니다.

## 구조

```
app/
  page.tsx           홈 — 월 총액, 카테고리 스택 그래프(클릭 상세), 다가오는 갱신
  list/page.tsx      목록 — 카테고리별 그룹(월 환산 소계), 일회성 지출 분리, inbox 배너
  settings/page.tsx  설정 — 언어/통화/가격지역/타임존, 주간 메일·알림 토글, 포워딩 주소
  layout.tsx         공통 셸 (헤더, 탭내비, 웰컴 팝업, 등록 모달)
components/
  WelcomeModal.tsx   첫 방문 팝업 — 로그인 유저 미표시, 7일 숨김(localStorage)
  AddModal.tsx       등록 모달 — 카탈로그 참고가 프리필, 일회성/수동갱신 분기, 연결제 연도 표기
  MonthChart.tsx     과거=실선 / 미래=빗금 스택 막대 (D8: 미래는 오늘 환율)
  ...
lib/
  types.ts           스키마(docs/schema.md 4장)와 1:1 대응하는 타입
  fx.ts              환율 유틸 (현재 더미 — TODO: fxRates 크론)
  auth.tsx           인증 스텁 (TODO: Firebase Google OAuth)
  store.tsx          인메모리 상태 (TODO: Firestore 구독으로 교체)
data/
  catalog-seed.json  참조용 카탈로그 시드 (KR/JP/US, 20서비스 54플랜, verification 플래그)
docs/
  schema.md          데이터 모델·설계 결정(D1~D13) 전체 문서
  mockup.html        정적 목업 (단일 파일, 디자인 원본)
```

## 다음 단계 (TODO)

1. **Firebase 연동** — `lib/auth.tsx`의 mock을 Google OAuth로 교체, `lib/store.tsx`를
   `users/{uid}/subscriptions` 구독으로 교체 (Multifolios 패턴 재활용)
2. **환율 크론** — Vercel Cron → Frankfurter API → `fxRates/{date}` 저장 (D9: 주말 폴백 포함)
3. **D7 월말 클램프** — `AddModal`의 다음 결제일 계산에 anchorDay 보존 로직
4. **주간 메일** — 일요일 09:00 (유저 타임존), self-report 버튼 포함 (D5·D10)
5. **영수증 포워딩 파싱** — 수신 → LLM 추출 → inbox 착지 → 유저 확정 (D12: 자동 병합 금지)
6. **i18n** — ko/ja/en, 카탈로그 names 3개 국어 활용 (D4: 언어·통화·가격지역 독립)

설계 결정의 근거는 `docs/schema.md`의 D1~D13 표를 참조.
