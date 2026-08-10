'use client';
import { useMemo } from 'react';
import { fmt, toJPY } from '@/lib/fx';
import { useLang } from '@/lib/i18n';
import { daysUntil, nextChargeDate } from '@/lib/monthly';
import { useStore, CATCOLOR } from '@/lib/store';

/** 30일 이내 갱신 예정 구독 (다음 결제일 오름차순) */
export default function RenewList() {
  const { cur, subs } = useStore();
  const { t } = useLang();

  const upcoming = useMemo(() => subs
    .map(s => {
      const d = nextChargeDate(s);
      return d ? { s, d, days: daysUntil(d) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.days >= 0 && x.days <= 30)
    .sort((a, b) => a.days - b.days), [subs]);

  if (!upcoming.length) {
    return <div className="renew-card"><div className="renew-empty">{t('noUpcoming')}</div></div>;
  }

  return (
    <div className="renew-card">
      {upcoming.map(({ s, days }) => {
        const manual = s.renew === 'manual' || s.plan.includes('수동갱신');
        return (
          <div className="renew" key={s.id}>
            <div className="r-icon" style={{ background: CATCOLOR[s.cat] }}>{s.init}</div>
            <div className="r-body">
              <div className="r-name">{s.name}</div>
              <div className="r-meta">
                {manual && <span className="flag">{t('manualRenew')} · </span>}
                {s.plan} · {s.cycle === 'year' ? t('yearly') : t('monthly')}
              </div>
            </div>
            <div className="r-right">
              <div className="r-amt">{fmt(toJPY(s.amt, s.c), cur)}</div>
              <div className={`r-day ${days <= 5 ? 'hot' : ''}`}>{days === 0 ? t('today') : `D-${days}`}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
