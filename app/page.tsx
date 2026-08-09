'use client';
import CurrencyToggle from '@/components/CurrencyToggle';
import MonthChart from '@/components/MonthChart';
import RenewList from '@/components/RenewList';
import { MONTHS } from '@/data/months';
import { fmt } from '@/lib/fx';
import { useStore } from '@/lib/store';

export default function Home() {
  const { cur } = useStore();
  const m = MONTHS[3]; // 이번 달
  const total = m.ai + m.dev + m.ent + m.sto;

  return (
    <main>
      <div className="total">
        <div className="label">8월 총 구독료</div>
        <div className="amount">{fmt(total, cur)}</div>
        <div className="sub">활성 구독 <b>9건</b> · 무료 체험 <b>1건</b></div>
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

      <footer>실선 = 결제 완료 · 빗금 = 예정 (오늘 환율 기준)</footer>
    </main>
  );
}
