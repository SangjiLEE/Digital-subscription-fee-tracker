/** 홈 그래프 더미 데이터 (JPY 환산, 카테고리별 월 합계) */
export interface MonthRow {
  label: string; past: boolean; today?: boolean;
  ai: number; dev: number; ent: number; sto: number;
}
export const MONTHS: MonthRow[] = [
  { label: '5월',  past: true,  ai: 6300, dev: 4400, ent: 5700, sto: 290 },
  { label: '6월',  past: true,  ai: 6350, dev: 4450, ent: 5750, sto: 290 },
  { label: '7월',  past: true,  ai: 7500, dev: 4500, ent: 6139, sto: 290 },
  { label: '8월',  past: false, ai: 7500, dev: 4500, ent: 6139, sto: 290, today: true },
  { label: '9월',  past: false, ai: 7500, dev: 4500, ent: 6139, sto: 290 },
  { label: '10월', past: false, ai: 7500, dev: 4500, ent: 6139, sto: 290 },
];
