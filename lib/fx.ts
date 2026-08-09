import type { Currency } from './types';

/**
 * 환율. 기동 시 Frankfurter(ECB)에서 최신값을 받아 아래 테이블을 갱신하고
 * localStorage에 24시간 캐시한다. 실패하면 하드코딩 폴백 유지.
 *
 * 설계 문서 D9(크론 → Firestore fxRates)는 Cloud Functions(유료 플랜) 필요
 * → 알파에서는 클라이언트 직접 페치로 대체. Blaze 전환 시 D9로 이행.
 */
export const FX_TO_JPY: Record<Currency, number> = {
  JPY: 1,
  USD: 150,          // 폴백값 — refreshRates()가 실측값으로 덮어씀
  KRW: 1 / 9.2,
};

export const SYM: Record<Currency, string> = { JPY: '¥', USD: '$', KRW: '₩' };

export const toJPY = (amount: number, c: Currency) => amount * FX_TO_JPY[c];

export function fmt(jpy: number, display: Currency): string {
  const v = jpy / FX_TO_JPY[display];
  const n = display === 'USD' ? +v.toFixed(v >= 100 ? 0 : 2) : Math.round(v);
  return SYM[display] + n.toLocaleString();
}

const CACHE_KEY = 'fxRatesV1';
const DAY_MS = 24 * 60 * 60 * 1000;

interface FxCache { fetchedAt: number; date: string; usdJpy: number; usdKrw: number; }

function apply(c: FxCache) {
  FX_TO_JPY.USD = c.usdJpy;
  FX_TO_JPY.KRW = c.usdJpy / c.usdKrw;
}

/** 환율 갱신. 반환값은 기준일(YYYY-MM-DD) 또는 null(폴백 사용 중). */
export async function refreshRates(): Promise<string | null> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const c: FxCache = JSON.parse(raw);
      if (Date.now() - c.fetchedAt < DAY_MS) { apply(c); return c.date; }
    }
  } catch { /* 캐시 손상 → 무시하고 재조회 */ }

  try {
    const r = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=JPY,KRW');
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    const c: FxCache = {
      fetchedAt: Date.now(), date: d.date,
      usdJpy: d.rates.JPY, usdKrw: d.rates.KRW,
    };
    apply(c);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
    return c.date;
  } catch (e) {
    console.warn('환율 조회 실패 — 폴백 환율 사용:', e);
    return null;
  }
}
