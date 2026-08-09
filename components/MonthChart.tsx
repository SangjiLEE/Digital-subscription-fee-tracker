'use client';
import { useState } from 'react';
import { MONTHS } from '@/data/months';
import { fmt } from '@/lib/fx';
import { useStore, CATCOLOR } from '@/lib/store';

const CATS = [
  ['ai', 'AI·LLM'], ['dev', '개발·인프라'], ['ent', '영상·음악'], ['sto', '스토리지'],
] as const;

/** 과거=실선/미래=빗금 스택 막대 + 클릭 시 월 상세 (D8: 미래는 오늘 환율) */
export default function MonthChart() {
  const { cur } = useStore();
  const [sel, setSel] = useState(3); // 기본: 이번 달
  const max = Math.max(...MONTHS.map(m => m.ai + m.dev + m.ent + m.sto));
  const m = MONTHS[sel];
  const total = m.ai + m.dev + m.ent + m.sto;

  return (
    <div className="chart-card">
      <div className={`bars ${sel !== null ? 'has-sel' : ''}`}>
        {MONTHS.map((row, i) => {
          const t = row.ai + row.dev + row.ent + row.sto;
          const h = Math.round((t / max) * 96);
          return (
            <div key={row.label}
              className={`bar-col ${row.past ? '' : 'future'} ${i === sel ? 'sel' : ''}`}
              role="button" tabIndex={0} aria-label={`${row.label} 상세 보기`}
              onClick={() => setSel(i)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(i); } }}>
              <span className="bar-val">{fmt(t, cur)}</span>
              <div className="bar" style={{ height: h }}>
                {(['ai', 'dev', 'ent', 'sto'] as const).map(k => (
                  <div key={k} className={`bar-seg ${k}`} style={{ height: `${(row[k] / t) * 100}%` }} />
                ))}
              </div>
              <span className="bar-label">{row.label}</span>
            </div>
          );
        })}
        <div className="today-seam"><span>오늘</span></div>
      </div>

      <div className="month-detail">
        <div className="md-head">
          <span>{m.label} 내역<span className="tag">{m.past ? '결제 완료' : '예정 · 오늘 환율 기준'}</span></span>
          <b>{fmt(total, cur)}</b>
        </div>
        {CATS.map(([k, label]) => (
          <div className="md-row" key={k}>
            <span><i className="dot" style={{ background: CATCOLOR[k] }} />{label}</span>
            <b>{fmt(m[k], cur)}</b>
          </div>
        ))}
      </div>

      <div className="legend">
        {CATS.map(([k, label]) => (
          <span key={k}><i className="dot" style={{ background: CATCOLOR[k] }} />{label}</span>
        ))}
      </div>
    </div>
  );
}
