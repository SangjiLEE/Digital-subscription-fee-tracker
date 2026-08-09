import type { Currency } from './types';

/**
 * 더미 환율. 실서비스에서는:
 *  - 매일 크론이 Frankfurter API → Firestore `fxRates/{YYYY-MM-DD}` 저장 (D9)
 *  - 클라이언트는 Firestore만 읽음 (API 직접 호출 금지)
 *  - 주말·공휴일은 마지막 영업일 값 폴백 (carriedFrom)
 *  - 과거 charge 표시는 chargedAt 날짜의 환율, 미래 예측은 오늘 환율 (D8)
 */
export const FX_TO_JPY: Record<Currency, number> = {
  JPY: 1,
  USD: 150,
  KRW: 1 / 9.2,
};

export const SYM: Record<Currency, string> = { JPY: '¥', USD: '$', KRW: '₩' };

export const toJPY = (amount: number, c: Currency) => amount * FX_TO_JPY[c];

export function fmt(jpy: number, display: Currency): string {
  const v = jpy / FX_TO_JPY[display];
  const n = display === 'USD' ? +v.toFixed(v >= 100 ? 0 : 2) : Math.round(v);
  return SYM[display] + n.toLocaleString();
}
