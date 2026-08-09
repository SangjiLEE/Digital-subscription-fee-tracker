import { toJPY } from './fx';
import type { SubRow, Cat } from './store';

/**
 * 구독 목록 → 월별 카테고리 지출 집계 (JPY 환산, 오늘 환율 기준 D8).
 * 창: 현재 월 -3 ~ +2 (6개월). charges 원장이 생기기 전까지 과거 월도
 * 현재 구독 구성으로 역산한 추정치다.
 */
export interface MonthCol {
  label: string; past: boolean;
  ai: number; dev: number; ent: number; sto: number; etc: number;
}

const CATS: Cat[] = ['ai', 'dev', 'ent', 'sto', 'etc'];

/** 연결제 next 'YYYY/M/D' → 월(0-base). 파싱 불가면 null */
function yearNextMonth(next: string): number | null {
  const m = next.match(/^\d{4}\/(\d{1,2})\/\d{1,2}$/);
  return m ? parseInt(m[1], 10) - 1 : null;
}

export function computeMonths(subs: SubRow[], now = new Date()): MonthCol[] {
  const cols: MonthCol[] = [];
  for (let off = -3; off <= 2; off++) {
    const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
    const col: MonthCol = {
      label: `${d.getMonth() + 1}월`, past: off < 0,
      ai: 0, dev: 0, ent: 0, sto: 0, etc: 0,
    };
    for (const s of subs) {
      const cat: Cat = CATS.includes(s.cat) ? s.cat : 'etc';
      const jpy = toJPY(s.amt, s.c);
      if (s.cycle === 'month') {
        // anchor 이전 월에는 청구 없음 (anchor 미상이면 전 기간 청구로 간주)
        if (s.anchor) {
          const a = new Date(s.anchor + 'T00:00:00');
          if (d < new Date(a.getFullYear(), a.getMonth(), 1)) continue;
        }
        col[cat] += jpy;
      } else {
        // 연결제: 갱신월에만 전액. 갱신월을 모르면 /12 균등 배분
        const m = s.anchor
          ? new Date(s.anchor + 'T00:00:00').getMonth()
          : yearNextMonth(s.next);
        if (m === null) col[cat] += jpy / 12;
        else if (d.getMonth() === m) col[cat] += jpy;
      }
    }
    cols.push(col);
  }
  return cols;
}

export const colTotal = (c: MonthCol) => c.ai + c.dev + c.ent + c.sto + c.etc;

/** D7 월말 클램프: day가 그 달에 없으면 말일로 */
function clampDate(y: number, m: number, day: number): Date {
  const last = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, last));
}

/** 다음 결제일 계산 (anchor 우선, 없으면 next 문자열 폴백). null = 판단 불가 */
export function nextChargeDate(s: SubRow, now = new Date()): Date | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (s.anchor) {
    const a = new Date(s.anchor + 'T00:00:00');
    if (s.cycle === 'month') {
      let d = clampDate(today.getFullYear(), today.getMonth(), a.getDate());
      if (d < today) d = clampDate(today.getFullYear(), today.getMonth() + 1, a.getDate());
      return d;
    }
    let d = clampDate(today.getFullYear(), a.getMonth(), a.getDate());
    if (d < today) d = clampDate(today.getFullYear() + 1, a.getMonth(), a.getDate());
    return d;
  }
  // 폴백: 표시용 next 문자열 파싱 ('M/D' 또는 'YYYY/M/D')
  const md = s.next.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (md) {
    let d = clampDate(today.getFullYear(), parseInt(md[1], 10) - 1, parseInt(md[2], 10));
    if (d < today) d = clampDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return d;
  }
  const ymd = s.next.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymd) {
    let d = clampDate(parseInt(ymd[1], 10), parseInt(ymd[2], 10) - 1, parseInt(ymd[3], 10));
    if (d < today) d = clampDate(d.getFullYear() + 1, d.getMonth(), d.getDate());
    return d;
  }
  return null;
}

export const daysUntil = (d: Date, now = new Date()) =>
  Math.round((d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
