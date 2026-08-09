'use client';
import { useMemo } from 'react';
import CurrencyToggle from '@/components/CurrencyToggle';
import MonthChart from '@/components/MonthChart';
import RenewList from '@/components/RenewList';
import { fmt } from '@/lib/fx';
import { computeMonths, colTotal } from '@/lib/monthly';
import { useStore } from '@/lib/store';

export default function Home() {
  const { cur, subs, oneTime, fxDate } = useStore();
  // fxDate 의존: 환율 갱신 시 재계산
  const months = useMemo(() => computeMonths(subs), [subs, fxDate]);
  const nowMonth = months[3];                 // 창의 4번째 = 현재 월
  const total = nowMonth ? colTotal(nowMonth) : 0;

  return (
    <main>
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
