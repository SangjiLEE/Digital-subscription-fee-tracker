import { toJPY } from './fx';
import { isActive, type OneTimeRow, type SubRow, type Cat } from './store';

/**
 * 구독 목록 → 월별 카테고리 지출 집계 (JPY 환산, 오늘 환율 기준 D8).
 * 창: 현재 월 -3 ~ +2 (6개월). charges 원장이 생기기 전까지 과거 월도
 * 현재 구독 구성으로 역산한 추정치다.
 */
export interface MonthCol {
  label: string; past: boolean; m: number;   // m: 1-base 월 번호 (표시용)
  ai: number; dev: number; ent: number; sto: number; etc: number;
  /** 접기 전 원본 카테고리별 금액 — 월 상세 표시용 (일회성은 etc) */
  detail: Partial<Record<Cat, number>>;
}

// 차트 세그먼트 키 — 신규 카테고리(prod/game/ins)는 '기타'로 접는다 (팔레트 4색+기타 유지)
const CHART_CATS = ['ai', 'dev', 'ent', 'sto'] as const;
const toChartCat = (c: Cat): 'ai' | 'dev' | 'ent' | 'sto' | 'etc' =>
  (CHART_CATS as readonly string[]).includes(c) ? c as 'ai' | 'dev' | 'ent' | 'sto' : 'etc';

/** 연결제 next 'YYYY/M/D' → 월(0-base). 파싱 불가면 null */
function yearNextMonth(next: string): number | null {
  const m = next.match(/^\d{4}\/(\d{1,2})\/\d{1,2}$/);
  return m ? parseInt(m[1], 10) - 1 : null;
}

/** 일회성 지출의 결제월 (0-base month index 포함 Date). date 우선, 없으면 note 'M/D' 파싱 */
function oneTimeMonth(o: OneTimeRow, now: Date): Date | null {
  if (o.date) {
    const d = new Date(o.date + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), 1);
  }
  const m = o.note.match(/^(\d{1,2})\/\d{1,2}/);
  return m ? new Date(now.getFullYear(), parseInt(m[1], 10) - 1, 1) : null;
}

/** 해지·일시정지 구독의 청구 상한일. active면 null (제한 없음) */
function chargeCutoff(s: SubRow, now: Date): Date | null {
  if (isActive(s)) return null;
  const e = s.endDate ? new Date(s.endDate + 'T00:00:00') : now;
  return Number.isNaN(e.getTime()) ? now : e;
}

export function computeMonths(subs: SubRow[], oneTime: OneTimeRow[] = [], now = new Date()): MonthCol[] {
  const cols: MonthCol[] = [];
  for (let off = -3; off <= 2; off++) {
    const d = new Date(now.getFullYear(), now.getMonth() + off, 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const col: MonthCol = {
      label: `${d.getMonth() + 1}월`, past: off < 0, m: d.getMonth() + 1,
      ai: 0, dev: 0, ent: 0, sto: 0, etc: 0, detail: {},
    };
    const add = (cat: Cat, v: number) => {
      col[toChartCat(cat)] += v;
      col.detail[cat] = (col.detail[cat] ?? 0) + v;
    };
    for (const s of subs) {
      const jpy = toJPY(s.amt, s.c);
      const cutoff = chargeCutoff(s, now);
      // 이 월의 청구일 (anchor 일자 기준, 없으면 월초로 근사)
      const chargeDay = s.anchor
        ? Math.min(new Date(s.anchor + 'T00:00:00').getDate(), lastDay) : 1;
      const chargeDate = new Date(d.getFullYear(), d.getMonth(), chargeDay);
      // 해지·일시정지 이후의 청구는 제외 (과거 기록은 보존)
      if (cutoff && chargeDate > cutoff) continue;
      if (s.cycle === 'month') {
        // anchor 이전 월에는 청구 없음 (anchor 미상이면 전 기간 청구로 간주)
        if (s.anchor) {
          const a = new Date(s.anchor + 'T00:00:00');
          if (d < new Date(a.getFullYear(), a.getMonth(), 1)) continue;
        }
        add(s.cat, jpy);
      } else {
        // 연결제: 갱신월에만 전액. 갱신월을 모르면 /12 균등 배분
        const m = s.anchor
          ? new Date(s.anchor + 'T00:00:00').getMonth()
          : yearNextMonth(s.next);
        if (m === null) add(s.cat, jpy / 12);
        else if (d.getMonth() === m) add(s.cat, jpy);
      }
    }
    // 일회성 지출: 결제월에만 '기타'로 포함 (헤드라인 구독료와는 별개)
    for (const o of oneTime) {
      const om = oneTimeMonth(o, now);
      if (om && om.getFullYear() === d.getFullYear() && om.getMonth() === d.getMonth()) {
        add('etc', toJPY(o.amt, o.c));
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
  if (!isActive(s)) return null;      // 해지·일시정지: 다음 결제 없음
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
