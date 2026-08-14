'use client';
import { useMemo } from 'react';
import CurrencyToggle from '@/components/CurrencyToggle';
import MonthChart from '@/components/MonthChart';
import RenewList from '@/components/RenewList';
import { fmt } from '@/lib/fx';
import { useLang } from '@/lib/i18n';
import { computeMonths, colTotal, daysUntil, nextChargeDate } from '@/lib/monthly';
import { useStore, isActive } from '@/lib/store';
import { useMounted } from '@/lib/useMounted';

export default function Home() {
  const { cur, subs, oneTime, fxDate, renewAlert, isDemo } = useStore();
  const { t, mon } = useLang();
  const mounted = useMounted();
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

  if (!mounted) return <main><div className="page-skel" aria-hidden="true"><i /><i /><i /></div></main>;

  return (
    <main>
      {isDemo && subs.length > 0 && (
        <div className="demo-note" role="note">
          <i className="soon">{t('sampleBadge')}</i> {t('sampleNote')}
        </div>
      )}
      {imminent.length > 0 && (() => {
        const d0 = daysUntil(imminent[0].d!);
        const when = d0 === 0 ? t('renewToday') : d0 === 1 ? t('renewTomorrow') : t('renewInDays', { n: d0 });
        return (
          <div className="renew-alert" role="status">
            ⏰ <b>{imminent.length > 1
              ? t('alertMultiN', { n: imminent.length, name: imminent[0].s.name, when })
              : t('alertSingle', { name: imminent[0].s.name, when })}</b>
            <span className="ra-day">{d0 === 0 ? t('today') : `D-${d0}`}</span>
          </div>
        );
      })()}
      <div className="total">
        <div className="label">{nowMonth && t('totalLabel', { mon: mon(nowMonth.m) })}</div>
        <div className="amount">{fmt(total, cur)}</div>
        <div className="sub">{t('countsLine', { n: subs.filter(isActive).length, k: oneTime.length })}</div>
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
