'use client';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { SYM } from '@/lib/fx';
import type { Currency } from '@/lib/types';

const ORDER: Currency[] = ['JPY', 'USD', 'KRW'];
const CUR_LABEL: Record<Currency, string> = { JPY: '엔 (JPY)', USD: '달러 (USD)', KRW: '원 (KRW)' };

/**
 * 설정. "준비 중" 표시는 인프라(다국어·메일 발송·다지역 카탈로그)가
 * 필요한 기능 — 가짜 컨트롤 대신 상태를 정직하게 노출한다.
 */
export default function SettingsPage() {
  const { cur, setCur } = useStore();
  const nextCur = ORDER[(ORDER.indexOf(cur) + 1) % ORDER.length];

  return (
    <main>
      <section>
        <div className="sec-head"><h2>표시</h2></div>
        <div className="set-card">
          <button className="set-row set-btn" onClick={() => setCur(nextCur)}
            aria-label={`표시 통화 변경 (현재 ${cur})`}>
            표시 통화
            <span className="set-val">{SYM[cur]} {CUR_LABEL[cur]} ›</span>
          </button>
          <div className="set-row dim">UI 언어<span className="set-val">한국어<i className="soon">준비 중</i></span></div>
          <div className="set-row dim">가격 참조 지역<span className="set-val">일본 (JP)<i className="soon">준비 중</i></span></div>
          <div className="set-row dim">타임존<span className="set-val">브라우저 자동<i className="soon">준비 중</i></span></div>
        </div>
        <p className="set-note">표시 통화는 홈의 ₩/¥/$ 토글과 연동되며, 이 기기에 저장됩니다.</p>
      </section>

      <section>
        <div className="sec-head"><h2>알림</h2></div>
        <div className="set-card">
          <div className="set-row dim">주간 요약 메일<span className="set-val"><i className="soon">준비 중</i></span></div>
          <div className="set-row dim">갱신·체험 종료 알림<span className="set-val"><i className="soon">준비 중</i></span></div>
        </div>
        <p className="set-note">메일·푸시 알림은 발송 인프라 구축 후 제공될 예정이에요.</p>
      </section>

      <section>
        <div className="sec-head"><h2>영수증 자동 등록</h2></div>
        <div className="set-card">
          <div className="set-row dim">메일 포워딩 감지<span className="set-val"><i className="soon">준비 중</i></span></div>
        </div>
        <p className="set-note">
          지금은 <Link href="/list" className="set-link">목록 화면의 사진 인식</Link>으로
          영수증·구독 화면을 올리면 자동 등록할 수 있어요.
        </p>
      </section>

      <footer>Digital Sub Fee Tracker alpha</footer>
    </main>
  );
}
