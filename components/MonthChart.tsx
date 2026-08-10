'use client';
import { useMemo, useState } from 'react';
import { fmt } from '@/lib/fx';
import { useLang } from '@/lib/i18n';
import { computeMonths, colTotal } from '@/lib/monthly';
import { useStore, CATCOLOR } from '@/lib/store';

const CATS = [
  ['ai', 'catAi'], ['dev', 'catDev'], ['ent', 'catEnt'], ['sto', 'catStoShort'], ['etc', 'catEtc'],
] as const;

const PLOT = 108;  // 눈금 상한이 차지하는 막대 최대 높이(px)
const PLOT_H = 128; // .plot 전체 높이(px) — CSS와 동기
const VBW = 600;    // 추세선 SVG viewBox 폭

/** 과거=실선/미래=빗금 스택 막대 + 클릭 시 월 상세 (D8: 미래는 오늘 환율) */
export default function MonthChart() {
  const { cur, subs, oneTime, fxDate } = useStore();
  const { t, mon } = useLang();
  const [sel, setSel] = useState(3); // 기본: 이번 달
  // fxDate 의존: 환율 갱신 시 재계산
  const MONTHS = useMemo(() => computeMonths(subs, oneTime), [subs, oneTime, fxDate]);
  const totals = MONTHS.map(colTotal);
  const niceMax = Math.max(5000, Math.ceil(Math.max(...totals) / 5000) * 5000); // 5천 엔 단위 올림
  const ticks = [0, niceMax / 2, niceMax];
  const firstFuture = MONTHS.findIndex(r => !r.past);
  const m = MONTHS[sel];
  const total = totals[sel];
  const delta = sel > 0 ? total - totals[sel - 1] : null;

  // 추세선 좌표: 각 막대 상단 중앙
  const pts = totals.map((t, i) => ({
    xPct: ((i + 0.5) / MONTHS.length) * 100,
    x: ((i + 0.5) / MONTHS.length) * VBW,
    y: PLOT_H - (t / niceMax) * PLOT,
  }));
  const toStr = (a: typeof pts) => a.map(p => `${p.x},${p.y}`).join(' ');

  if (subs.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-empty">{t('emptyChart')}</div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="plot">
        {ticks.map(v => (
          <div key={v} className={`gridline ${v === 0 ? 'zero' : ''}`}
            style={{ bottom: (v / niceMax) * PLOT }}>
            <span>{v === 0 ? '0' : fmt(v, cur)}</span>
          </div>
        ))}
        <div className="bars">
          {MONTHS.map((row, i) => {
            const tot = totals[i];
            return (
              <div key={row.label}
                className={`bar-col ${row.past ? '' : 'future'} ${i === sel ? 'sel' : ''}`}
                role="button" tabIndex={0} aria-label={t('detailOf', { mon: mon(row.m) })}
                onClick={() => setSel(i)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(i); } }}>
                <span className="bar-val">{fmt(tot, cur)}</span>
                <div className="bar" style={{ height: Math.round((tot / niceMax) * PLOT) }}>
                  {tot > 0 && (['ai', 'dev', 'ent', 'sto', 'etc'] as const).map(k =>
                    row[k] > 0 && (
                      <div key={k} className={`bar-seg ${k}`} style={{ height: `${(row[k] / tot) * 100}%` }} />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
        <svg className="trend" viewBox={`0 0 ${VBW} ${PLOT_H}`} preserveAspectRatio="none" aria-hidden="true">
          <polyline points={toStr(pts.slice(0, firstFuture < 0 ? pts.length : firstFuture))} />
          {firstFuture > 0 && (
            <polyline className="proj" points={toStr(pts.slice(firstFuture - 1))} />
          )}
        </svg>
        <div className="trend-dots">
          {pts.map((p, i) => (
            <i key={i} className="trend-dot" style={{ left: `${p.xPct}%`, top: p.y }} />
          ))}
        </div>
        {firstFuture > 0 && (
          <div className="today-seam"
            style={{ left: `calc(38px + (100% - 38px) * ${firstFuture / MONTHS.length})` }}>
            <span>{t('today')}</span>
          </div>
        )}
      </div>
      <div className="bar-labels">
        {MONTHS.map((row, i) => (
          <span key={row.label} className={i === sel ? 'sel' : ''}>
            {mon(row.m)}{!row.past && <small>{t('futureSuffix')}</small>}
          </span>
        ))}
      </div>

      <div className="month-detail">
        <div className="md-head">
          <span>{t('detailOf', { mon: mon(m.m) })}<span className="tag">{m.past ? t('paidTag') : t('projTag')}</span></span>
          <b>{fmt(total, cur)}</b>
        </div>
        {delta !== null && delta !== 0 && (
          <div className={`md-delta ${delta > 0 ? 'up' : 'down'}`}>
            {delta > 0
              ? t('deltaUp', { v: fmt(Math.abs(delta), cur) })
              : t('deltaDown', { v: fmt(Math.abs(delta), cur) })}
          </div>
        )}
        {delta === 0 && <div className="md-delta flat">{t('deltaFlat')}</div>}
        {CATS.map(([k, key]) => (
          <div className="md-row" key={k}>
            <span><i className="dot" style={{ background: CATCOLOR[k] }} />{t(key)}</span>
            <b>{fmt(m[k], cur)}</b>
          </div>
        ))}
      </div>

      <div className="legend">
        {CATS.map(([k, key]) => (
          <span key={k}><i className="dot" style={{ background: CATCOLOR[k] }} />{t(key)}</span>
        ))}
      </div>
    </div>
  );
}
