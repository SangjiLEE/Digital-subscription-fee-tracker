'use client';
import { useMemo } from 'react';
import CurrencyToggle from '@/components/CurrencyToggle';
import MonthChart from '@/components/MonthChart';
import RenewList from '@/components/RenewList';
import { fmt } from '@/lib/fx';
import { useLang } from '@/lib/i18n';
import { computeMonths, colTotal, daysUntil, nextChargeDate } from '@/lib/monthly';
import { useStore } from '@/lib/store';

export default function Home() {
  const { cur, subs, oneTime, fxDate, renewAlert } = useStore();
  const { t, mon } = useLang();
  // fxDate 의존: 환율 갱신 시 재계산
  const months = useMemo(() => computeMonths(subs, oneTime), [subs, oneTime, fxDate]);
  const subOnly = useMemo(() => computeMonths(subs), [subs, fxDate]);
  const nowMonth = months[3];                 // 창의 4번째 = 현재 월
  // 헤드라인 "총 구독료"는 정기 구독만 (일회성은 차트에만 포함)
  const total = subOnly[3] ? colTotal(subOnly[3]) : 0;
  // 갱신 임박(3일 이내) 앱 내 알림 — 설정에서 켜고 끔
  const imminent = useMemo(() => renewAlert
    ? subs.map(s => ({ s, d: nextChargeDate(s) }))
        .filter(x => x.d && daysUntil(x.d) >= 0 && daysUntil(x.d) <= 3)
        .sort((a, b) => daysUntil(a.d!) - daysUntil(b.d!))
    : [], [subs, renewAlert, fxDate]);

  return (
    <main>
      {imminent.length > 0 && (
        <div className="renew-alert" role="status">
          ⏰ <b>{imminent.length > 1
            ? t('alertMulti', { name: imminent[0].s.name, n: imminent.length - 1 })
            : t('alertOne', { name: imminent[0].s.name })}</b>
          <span className="ra-day">{daysUntil(imminent[0].d!) === 0 ? t('today') : `D-${daysUntil(imminent[0].d!)}`}</span>
        </div>
      )}
      <div className="total">
        <div className="label">{nowMonth && t('totalLabel', { mon: mon(nowMonth.m) })}</div>
        <div className="amount">{fmt(total, cur)}</div>
        <div className="sub">{t('countsLine', { n: subs.length, k: oneTime.length })}</div>
        <CurrencyToggle />
      </div>

      <section>
        <div className="sec-head"><h2>{t('monthlySpend')}</h2><span className="hint">{t('tapBarHint')}</span></div>
        <MonthChart />
      </section>

      <section>
        <div className="sec-head"><h2>{t('upcoming')}</h2><span className="hint">{t('within30')}</span></div>
        <RenewList />
      </section>

      <footer>
        {t('footerLegend')}
        {' · '}{fxDate ? t('fxBase', { d: fxDate }) : t('fxFixed')}
      </footer>
    </main>
  );
}
