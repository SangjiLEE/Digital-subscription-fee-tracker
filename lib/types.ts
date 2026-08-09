/** 스키마 문서 4장과 1:1 대응하는 타입. Firestore 연동 시 그대로 사용 */

export type Currency = 'JPY' | 'USD' | 'KRW';
export type CategoryId = 'ai_llm' | 'dev_infra' | 'cloud_storage' | 'entertainment'
  | 'productivity' | 'news_content' | 'game' | 'health' | 'other';
export type RenewalType = 'auto' | 'manual' | 'one_time';
export type IntervalUnit = 'day' | 'week' | 'month' | 'year';

export interface Subscription {
  id: string;
  serviceId: string | null;          // 카탈로그 매칭, null = 커스텀
  planId: string | null;
  displayName: string;
  planName?: string;
  normalizedName: string;            // 그룹핑 키

  amountMinor: number;               // 정수 최소단위 (부동소수점 금지)
  currency: Currency;
  taxIncluded: boolean;

  renewalType: RenewalType;
  intervalUnit: IntervalUnit | null; // one_time이면 null
  intervalCount: number | null;
  anchorDate: string | null;         // 'YYYY-MM-DD'. 다음 결제일은 항상 계산 (D7: 월말 클램프)
  nextChargeOverride?: string;

  quantity: number;
  status: 'trial' | 'active' | 'paused' | 'canceled';
  trialEndsAt?: string;
  categoryOverride?: CategoryId;
  paymentMethodId?: string;

  source: 'manual' | 'forward' | 'gmail';
  confidence?: number;
  needsReview: boolean;
  dedupKey: string;

  createdAt: string;
  updatedAt: string;
}

/** 불변 원장 (D2·D8): 수정 금지, 정정은 voided + 신규 */
export interface Charge {
  id: string;
  subscriptionId: string;
  chargedAt: string;                 // 'YYYY-MM-DD'
  amountMinor: number;               // 원본 금액 — 환산액을 저장하지 않는다
  currency: Currency;
  paymentMethodId?: string;
  sourceMessageId?: string;
  dedupKey: string;
  voided: boolean;
  voidReason?: string;
  createdAt: string;
}

export interface UserPrefs {
  locale: 'ko' | 'ja' | 'en';
  displayCurrency: Currency;         // locale과 독립 (D4)
  priceRegion: 'KR' | 'JP' | 'US';   // 카탈로그 참조 지역 — locale과 독립
  timezone: string;
  weeklyEmail: boolean;              // 일요일 09:00 (D5)
  eventAlerts: boolean;
}
