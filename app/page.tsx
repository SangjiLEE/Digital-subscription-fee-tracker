'use client';
import { useMemo } from 'react';
import CurrencyToggle from '@/components/CurrencyToggle';
import MonthChart from '@/components/MonthChart';
import RenewList from '@/components/RenewList';
import { fmt } from '@/lib/fx';
import { computeMonths, colTotal, daysUntil, nextChargeDate } from '@/lib/monthly';
import { useStore } from '@/lib/store';

export default function Home() {
  const { cur, subs, oneTime, fxDate, renewAlert } = useStore();
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
          ⏰ <b>{imminent[0].s.name}</b>
          {imminent.length > 1 ? ` 외 ${imminent.length - 1}건이` : '이(가)'} 3일 내 갱신돼요
          <span className="ra-day">{daysUntil(imminent[0].d!) === 0 ? '오늘' : `D-${daysUntil(imminent[0].d!)}`}</span>
        </div>
      )}
      <div className="total">
        <div className="label">{nowMonth?.label} 총 구독료</div>
        <div className="amount">{fmt(total, cur)}</div>
        <div className="sub">활성 구독 <b>{subs.length}건</b> · 일회성 <b>{oneTime.length}건</b></div>
        <CurrencyToggle />
      </div>

      <section>
        <div className="sec-head"><h2>월별 지출</h2><span className="hint">막대를 누르면 상세</span></div>
        <MonthChart />
      </section>

      <section>
        <div className="sec-head"><h2>다가오는 갱신</h2><span className="hint">30일 이내</span></div>
        <RenewList />
      </section>

      <footer>
        실선 = 결제 완료 · 빗금 = 예정
        {' · '}{fxDate ? `환율 ECB ${fxDate} 기준` : '고정 환율 기준'}
      </footer>
    </main>
  );
}
