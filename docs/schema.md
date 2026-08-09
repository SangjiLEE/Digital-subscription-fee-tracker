# 구독료 트래커 — 데이터 모델 & 설계 문서

> 작성일: 2026-08-09 · 상태: 설계 확정 (MVP 범위)
> 스택 전제: Next.js + Firebase (Firestore) + Google OAuth — Multifolios 골격 재활용

---

## 1. 확정된 결정 사항

| # | 결정 | 내용 |
|---|---|---|
| D1 | 수집 방식은 레이어 구조 | ① 카탈로그 기반 수동 등록 → ② 영수증 메일 포워딩 → ③ Gmail 풀연동. MVP는 ①+②, ③은 수요 검증 후 (CASA 심사 필요) |
| D2 | 과거 데이터 = 보존 | 가입 전 이력 백필 아님. 등록 이후 발생하는 데이터를 불변으로 축적 |
| D3 | 역산 생성 없음 | 시작일로부터 과거 charges를 추정 생성하지 않음. 데이터는 전부 confirmed |
| D4 | 언어·통화 분리 | UI 언어(ko/ja/en)와 표시 통화(KRW/JPY/USD)는 독립된 선택. 언어에서 통화 기본값만 추론 |
| D5 | 주간 메일 | 주 1회, 유저 타임존 기준 일요일 09:00, 이메일 발송. AI가 문장형 브리핑 생성 |
| D6 | 이벤트 알림은 별도 | 체험 종료 임박·수동갱신 임박·새 구독 감지는 즉시 발송 (주간 메일과 독립) |
| D7 | 월말 규칙 | anchorDay 보존 + 매달 독립 클램프. 1/31 → 2/28 → 3/31 → 4/30 |
| D8 | 환율은 테이블을 박제 | 환산액이 아니라 일별 환율 테이블을 저장. 표시 시점에 선택 통화로 재계산 |
| D9 | 환율 소스 | Frankfurter API (ECB 기준환율, 무료·키 불필요). 주말·공휴일은 마지막 영업일 값으로 폴백 |
| D10 | AI 기능 방향 | 절약 진단 + 대체재 추천. 실사용은 주간 메일 내 self-report 버튼으로 수집 |
| D11 | 카테고리는 배타적 | 구독 1건 = 카테고리 1개. 기본값은 카탈로그, 유저 오버라이드 우선 |
| D12 | 병합은 화면의 일 | 원장 단위는 subscription. 같은 서비스 묶기는 대시보드 그룹핑으로만. 자동 병합 금지 |
| D13 | 플랫폼 | 웹 (Next.js). 모바일은 추후 PWA로 대응 |

---

## 2. 컬렉션 구조 (Firestore)

```
# ── 공용 (읽기 전용, 관리자만 쓰기) ──────────────────
services/{serviceId}                     # 서비스 카탈로그
services/{serviceId}/plans/{planId}      # 서비스별 플랜·가격
fxRates/{YYYY-MM-DD}                     # 일별 환율 테이블
categories/{categoryId}                  # 카테고리 마스터

# ── 유저별 ──────────────────────────────────────────
users/{uid}                              # 프로필 + prefs
users/{uid}/subscriptions/{subId}        # 구독 계약 (현재 상태)
users/{uid}/subscriptions/{subId}/changes/{changeId}   # 변경 이력
users/{uid}/charges/{chargeId}           # 결제 실적 (불변 원장)
users/{uid}/paymentMethods/{pmId}        # 결제 수단
users/{uid}/inbox/{itemId}               # 파싱 후보 (확정 전 대기)
users/{uid}/summary/current              # 대시보드용 비정규화 캐시
```

---

## 3. 공용 컬렉션

### 3.1 services — 서비스 카탈로그

```ts
interface Service {
  id: string;                          // 'netflix', 'claude'
  names: { ko: string; ja: string; en: string };
  categoryId: string;                  // 기본 카테고리
  region: 'JP' | 'US' | 'GLOBAL';     // 가격 기준 지역 (초기엔 JP/GLOBAL 중심)
  domains: string[];                   // 영수증 발신 도메인 매칭용 ['netflix.com']
  alternatives: string[];              // 대체재 추천용 serviceId 목록
  logoUrl?: string;
  updatedAt: Timestamp;                // 가격 재확인 크론이 갱신
}
```

### 3.2 services/{id}/plans — 플랜

```ts
interface Plan {
  id: string;                          // 'pro', 'max-5x'
  names: { ko: string; ja: string; en: string };
  amountMinor: number;                 // 최소 화폐단위 정수 (2000 = $20.00)
  currency: string;                    // ISO 4217
  intervalUnit: 'month' | 'year';
  intervalCount: number;
  annualEquivalentMinor?: number;      // 연간 결제 시 총액 (절약 진단용)
  taxIncluded: boolean;
  active: boolean;                     // 판매 종료 플랜은 false (기존 유저 매칭용 보존)
}
```

- 초기 시드: 실사용 20~30개 서비스를 웹 조사로 채움
- 유지: 월 1회 크론 + LLM(웹 검색)으로 가격 재확인 → 변경 감지 시 관리자 승인 큐에 후보 등록 (자동 반영 금지)

### 3.3 fxRates — 일별 환율

```ts
interface FxRateDay {
  date: string;                        // 'YYYY-MM-DD' (문서 ID와 동일)
  base: 'USD';
  rates: { JPY: number; KRW: number; USD: 1; /* 필요 통화 추가 */ };
  source: 'frankfurter';
  isBusinessDay: boolean;              // false면 carriedFrom의 값을 복사한 것
  carriedFrom?: string;                // 폴백 원본 날짜 (주말·공휴일)
}
```

- 매일 크론이 Frankfurter에서 수집해 저장. 클라이언트는 이 컬렉션만 읽음 (API 직접 호출 금지)
- 주말·공휴일은 마지막 영업일 값을 복사 저장 (`carriedFrom` 기록) → 일요일 주간 메일에서도 조회 실패 없음
- **한 번 쓴 날짜의 레코드는 수정하지 않음** (과거 환산의 재현성 보장)

### 3.4 categories

```ts
interface Category {
  id: string;
  names: { ko: string; ja: string; en: string };
  sortOrder: number;
}
```

초기 세트: `ai_llm`(AI·LLM) / `dev_infra`(개발·인프라) / `cloud_storage`(클라우드·스토리지) / `entertainment`(영상·음악) / `productivity`(생산성·업무) / `news_content`(뉴스·콘텐츠) / `game`(게임) / `health`(건강) / `other`(기타)

---

## 4. 유저 컬렉션

### 4.1 users — prefs

```ts
interface UserPrefs {
  locale: 'ko' | 'ja' | 'en';          // UI 언어
  displayCurrency: 'KRW' | 'JPY' | 'USD';  // 표시 통화 — locale과 독립 (D4)
  timezone: string;                    // IANA, 예: 'Asia/Tokyo'
  weeklyEmail: boolean;                // 주간 메일 수신 여부
  eventAlerts: boolean;                // 이벤트성 알림 수신 여부
}
```

- 최초 가입 시 locale에서 displayCurrency 기본값 추론 (ko→KRW, ja→JPY, en→USD)
- 이후 유저 선택을 그대로 보존 — 자동 연동하지 않음

### 4.2 subscriptions — 구독 계약 (현재 상태)

```ts
interface Subscription {
  id: string;
  serviceId: string | null;            // 카탈로그 매칭. null = 커스텀
  planId: string | null;               // 카탈로그 플랜 매칭. null = 커스텀 플랜
  displayName: string;
  planName?: string;                   // 커스텀 플랜명 or 카탈로그 스냅샷
  normalizedName: string;              // 그룹핑 키 (소문자, 공백·기호 제거)

  // ── 돈 ── 부동소수점 금지, 정수 최소단위만
  amountMinor: number;
  currency: string;                    // ISO 4217
  taxIncluded: boolean;

  // ── 주기 ──
  renewalType: 'auto' | 'manual' | 'one_time';
  //   auto     : 자동갱신 — "빠져나가기 전" 알림
  //   manual   : 수동갱신(도메인, 연간 라이선스) — "끊기기 전" 알림
  //   one_time : 일회성 — 월 총액 집계 제외, 별도 섹션 표시
  intervalUnit: 'day' | 'week' | 'month' | 'year' | null;  // one_time이면 null
  intervalCount: number | null;
  anchorDate: string | null;           // 최초(확인된) 결제일. 다음 결제일은 여기서 계산
  //   ※ anchorDay(일자)를 보존하고 매달 독립 클램프 (D7)
  //   ※ nextChargeDate를 필드로 저장하지 않음 — 항상 계산
  nextChargeOverride?: string;         // 명세서로 확인된 예외만

  quantity: number;                    // 시트 수 등
  status: 'trial' | 'active' | 'paused' | 'canceled';
  trialEndsAt?: string;

  categoryOverride?: string;           // 유저 지정 카테고리
  //   적용값 = categoryOverride ?? service.categoryId ?? 'other'
  paymentMethodId?: string;

  // ── 수집 메타 ──
  source: 'manual' | 'forward' | 'gmail';
  confidence?: number;                 // 파싱 신뢰도 (0~1)
  needsReview: boolean;
  dedupKey: string;                    // 재파싱·중복 전달 방지

  // ── AI용 ──
  lastUsedSelfReport?: {               // 주간 메일 self-report 버튼 응답
    answeredAt: string;
    usedRecently: boolean;
  };

  createdAt: Timestamp;                // = "언제 등록했는지"
  updatedAt: Timestamp;
}
```

### 4.3 subscriptions/{id}/changes — 변경 이력

플랜 변경·요금 변경·수량 변경·상태 변경을 하나의 이력으로 통합.
**본체는 항상 현재 값, changes가 과거를 보존한다** (D2의 실체).

```ts
interface SubscriptionChange {
  id: string;
  effectiveFrom: string;               // 'YYYY-MM-DD'
  changeType: 'plan' | 'price' | 'quantity' | 'status';
  // 변경 후 값 스냅샷
  planId?: string | null;
  planName?: string;
  amountMinor?: number;
  currency?: string;
  quantity?: number;
  status?: string;
  reason: 'user_edit' | 'detected';    // detected = 영수증 파싱으로 감지
  createdAt: Timestamp;
}
```

용도: 요금 인상 감지 알림, "작년 대비 카테고리 지출 추이", 플랜 업그레이드 연속성 유지 (Claude Pro → Max는 같은 구독의 change로 기록).

### 4.4 charges — 결제 실적 (불변 원장)

```ts
interface Charge {
  id: string;
  subscriptionId: string;
  chargedAt: string;                   // 'YYYY-MM-DD'
  amountMinor: number;                 // 원본 금액 (불변)
  currency: string;                    // 원본 통화 (불변)
  paymentMethodId?: string;
  sourceMessageId?: string;            // 영수증 메일 ID
  dedupKey: string;
  voided: boolean;                     // 정정은 수정이 아니라 void + 신규 추가
  voidReason?: string;
  createdAt: Timestamp;
}
```

**불변 원칙 (D2·D8):**
- 한 번 쓰면 수정하지 않는다. 정정 = `voided: true` + 새 레코드
- 환산액을 저장하지 않는다. 표시 시 `fxRates[chargedAt]`(비영업일이면 carriedFrom)을 조회해 선택 통화로 환산
- 통화 버튼을 눌러도 과거 값이 흔들리지 않는 이유: 환율 테이블 자체가 불변이므로 어느 통화로든 재현 가능

### 4.5 paymentMethods

```ts
interface PaymentMethod {
  id: string;
  label: string;                       // '楽天カード', '신한 체크'
  billingCurrency: string;             // 카드 청구 통화
  fxMarkupPct: number;                 // 해외결제 수수료 % (일본 카드 대체로 1.6~2.2)
  //   USD 구독 + JPY 카드 → 실청구 추정 = 중간환율 환산 × (1 + fxMarkupPct/100)
}
```

### 4.6 inbox — 파싱 후보

파싱 결과는 원장에 직행하지 않는다. 반드시 여기 착지 → 유저 확정 → subscriptions/charges 반영.
①②③ 모든 수집 레이어가 같은 출구를 쓴다 (③ 추가 시 파이프라인 재작성 불필요).

```ts
interface InboxItem {
  id: string;
  source: 'forward' | 'gmail';
  parsedAt: Timestamp;
  raw: { from: string; subject: string; receivedAt: string };
  extracted: {
    serviceGuess: string | null;       // serviceId 추정
    displayName: string;
    amountMinor: number;
    currency: string;
    chargedAt: string;
    planGuess?: string;
    confidence: number;
  };
  suggestedAction: 'new_subscription' | 'new_charge' | 'plan_change';
  //   같은 서비스 감지 시 자동 병합 금지 (D12) —
  //   "기존 구독의 플랜 변경인가요, 별개 구독인가요?" 를 유저에게 질문
  status: 'pending' | 'confirmed' | 'dismissed';
  linkedSubscriptionId?: string;       // 확정 시 연결
}
```

### 4.7 summary/current — 대시보드 캐시

구독 변경·charge 확정 시 Cloud Function이 재계산하는 비정규화 문서.

```ts
interface Summary {
  monthlyTotalByCurrency: Record<string, number>;   // 원본 통화별 월 합계
  activeCount: number;
  byCategory: Record<string, Record<string, number>>; // categoryId → 통화별 월 합계
  upcomingCharges: Array<{ subscriptionId: string; date: string;
                           amountMinor: number; currency: string }>;  // 다음 60일
  recalculatedAt: Timestamp;
}
```

표시 통화 환산은 저장하지 않는다 — 클라이언트가 오늘의 fxRates로 계산 (D8).

---

## 5. 화면 규칙 (그래프·표시)

### 5.1 월별 그래프 — 하나의 타임라인

```
[ 과거 ────────── │오늘│ ────────── 미래 ]
  charges 기반        subscriptions 기반 예측
  실선·진한 색         점선·흐린 색/빗금
  박제된 그날 환율      오늘 환율로 재계산
```

- 세로축: **카테고리별 누적 막대 (stacked bar)** — 그래프 요구와 카테고리 분석을 한 화면에서 해결
- 첫 달: 과거 구간 비어있음 → 미래 예측만 표시. 빈 과거 차트를 보여주지 않는다
- 미래 구간의 실용 가치: "다음 달 연간결제 3건 집중 → 일시 지출 급증" 사전 인지
- 통화 전환 시: 과거 막대는 각 날짜의 박제 환율, 미래 막대만 오늘 환율로 변동

### 5.2 대시보드 구성 (초기 유저 기준)

1. 이번 달 남은 청구 예정 (다음 30일)
2. 현재 월 총액 / 연 환산액 (표시 통화 기준, FX 마크업 반영 추정치 병기)
3. 다가오는 갱신 — 수동갱신·체험 종료 우선 강조
4. 서비스 그룹 뷰 — normalizedName/serviceId로 묶어 표시 (원장은 별개 유지)
5. 일회성(one_time) 지출은 별도 섹션 — 월 총액에 섞지 않는다

### 5.3 언어·통화 버튼

- 헤더에 언어 선택(ko/ja/en)과 통화 선택(KRW/JPY/USD) 버튼을 **각각** 배치
- 서비스명·카테고리명·플랜명은 카탈로그의 `names` 3개 국어 사용 — UI 문자열만 번역하는 반쪽 i18n 금지

---

## 6. 배치 작업 (크론)

| 작업 | 주기 | 내용 |
|---|---|---|
| 환율 수집 | 매일 (CET 16시 이후) | Frankfurter → fxRates 저장. 비영업일은 폴백 복사 |
| 주간 메일 | 유저 타임존 일요일 09:00 | 현시점 구독 리스트 + 지난주 대비 변화(청구 예정·새 감지·가격 인상·체험 종료) + LLM 문장형 브리핑 + self-report 버튼 2~3건 |
| 이벤트 알림 | 즉시 (트리거형) | 체험 종료 D-3, 수동갱신 임박, 새 구독 감지 |
| 카탈로그 재확인 | 월 1회 | LLM + 웹 검색으로 가격 변동 감지 → 관리자 승인 큐 |
| summary 재계산 | 변경 트리거 | Cloud Function |

주간 메일은 주 1회 고정 — 매일 발송하지 않는다 (읽지 않는 메일 = 스팸화).

---

## 7. AI 기능 설계 (D10)

### 7.1 실사용 수집 — self-report

- 주간 메일에 구독 2~3건씩 "최근 한 달 쓰셨나요?" 버튼 → `lastUsedSelfReport` 저장
- 매주 로테이션으로 몇 주 내 전체 실사용 지도 완성

### 7.2 절약 진단

| 진단 | 근거 데이터 |
|---|---|
| 유령 구독 (3개월+ 미사용) | self-report |
| 카테고리 중복 (예: 영상 4개) | categoryId |
| 요금 인상 감지 | changes 이력 |
| 연간 전환 절감액 | plans.annualEquivalentMinor |
| 상위 플랜 과잉 | planId + self-report |

### 7.3 대체재 추천

- `services.alternatives` + plans 가격으로 동일 카테고리 내 비교 제시
- **제휴 링크 없이 시작** — 추천의 중립성이 이 서비스의 신뢰 기반. 수익화는 별도 축(Pro 구독 등)으로

---

## 8. 로드맵

**MVP (①+② 레이어)**
- 수동 등록 (카탈로그 탭 선택 + 커스텀)
- 영수증 포워딩 파싱 → inbox → 확정
- 대시보드 + 타임라인 그래프 + 카테고리 분석
- 언어·통화 전환, 환율 파이프라인
- 주간 메일 + 이벤트 알림 + self-report
- 절약 진단(중복·인상·연간전환) — self-report 쌓이면 유령 구독 진단 활성화

**2단계 (수요 검증 후)**
- ③ Gmail 풀연동 (CASA 심사 연 $540~1k 선행) — 받은메일함 과거 스캔으로 신규 유저 즉시 백필
- 대체재 추천 고도화
- PWA 대응

**MVP에서 의도적으로 뺀 것**
- 역산 charges 생성 (D3)
- 은행/카드 자동 연동 (일본 규제·Money Forward 경쟁 축)
- 네이티브 앱

---

## 9. 목업 단계에서 확정된 표시 규칙 (2026-08-09 추가)

- 연결제 구독은 다음 결제일에 **연도까지 표기** (예: 다음 2027/8/9). 목록 행 메타는 "연 결제"로 구분
- 목록의 카테고리 그룹 소계는 **월 환산** (연결제 ÷12) — 행에는 원 금액 그대로 (D1과 일관)
- 목록 탭은 **카테고리별 그룹**으로 표시, 그룹 헤더에 건수·월 환산 소계
- 헤더 우상단은 설정 아이콘 대신 **로그인 버튼** (로그인 후 프로필/로그아웃으로 전환)
- 첫 방문 시 **웰컴 팝업**: "디지털 구독료, 얼마인지 알고 계신가요?" + [시작하기] + [일주일 동안 표시하지 않기(7일 숨김)]
  - **로그인 유저에게는 표시하지 않는다** — 목적 안내는 신규 방문자 전용
- 홈 총액 아래에는 활성 구독·무료 체험 건수만 (카드 수수료 추정 표시는 상세 화면으로)
