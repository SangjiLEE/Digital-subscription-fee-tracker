'use client';
import { fmt, toJPY } from '@/lib/fx';
import { useStore } from '@/lib/store';
import type { Currency } from '@/lib/types';

interface Renewal {
  name: string; plan: string; amt: number; c: Currency;
  d: number; color: string; init: string; flag?: string;
}
const RENEWALS: Renewal[] = [
  { name: 'Claude', plan: 'Pro · 자동갱신', amt: 20, c: 'USD', d: 3, color: 'var(--c-ai)', init: 'C' },
  { name: 'Notion', plan: '무료 체험 종료', amt: 12, c: 'USD', d: 5, color: 'var(--c-dev)', init: 'N', flag: '체험 종료' },
  { name: 'Netflix', plan: '스탠다드 · 자동갱신', amt: 1590, c: 'JPY', d: 6, color: 'var(--c-ent)', init: 'N' },
  { name: 'example.com', plan: '도메인 · 수동갱신 필요', amt: 1800, c: 'JPY', d: 11, color: 'var(--c-sto)', init: 'D', flag: '수동갱신' },
];

export default function RenewList() {
  const { cur } = useStore();
  return (
    <div className="renew-card">
      {RENEWALS.map(r => (
        <div className="renew" key={r.name}>
          <div className="r-icon" style={{ background: r.color }}>{r.init}</div>
          <div className="r-body">
            <div className="r-name">{r.name}</div>
            <div className="r-meta">{r.flag && <span className="flag">{r.flag} · </span>}{r.plan}</div>
          </div>
          <div className="r-right">
            <div className="r-amt">{fmt(toJPY(r.amt, r.c), cur)}</div>
            <div className={`r-day ${r.d <= 5 ? 'hot' : ''}`}>D-{r.d}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
