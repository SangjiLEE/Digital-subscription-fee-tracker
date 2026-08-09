'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { SYM } from '@/lib/fx';

export default function SettingsPage() {
  const { cur } = useStore();
  const [weekly, setWeekly] = useState(true);
  const [alerts, setAlerts] = useState(true);

  return (
    <main>
      <section>
        <div className="sec-head"><h2>표시</h2></div>
        <div className="set-card">
          <div className="set-row">UI 언어<span className="set-val">한국어 ›</span></div>
          <div className="set-row">표시 통화<span className="set-val">{SYM[cur]} {cur} ›</span></div>
          <div className="set-row">가격 참조 지역<span className="set-val">일본 (JP) ›</span></div>
          <div className="set-row">타임존<span className="set-val">Asia/Tokyo ›</span></div>
        </div>
      </section>

      <section>
        <div className="sec-head"><h2>알림</h2></div>
        <div className="set-card">
          <div className="set-row">주간 요약 메일
            <span className="set-val">일요일 09:00
              <button className="switch" role="switch" aria-checked={weekly}
                aria-label="주간 요약 메일" onClick={() => setWeekly(v => !v)} />
            </span>
          </div>
          <div className="set-row">갱신·체험 종료 알림
            <span className="set-val">
              <button className="switch" role="switch" aria-checked={alerts}
                aria-label="갱신 알림" onClick={() => setAlerts(v => !v)} />
            </span>
          </div>
        </div>
      </section>

      <section>
        <div className="sec-head"><h2>영수증 포워딩</h2><span className="hint">이 주소로 전달하면 자동 감지</span></div>
        <div className="set-card">
          <div className="fwd"><span>sangji-x7f2@in.subfeetracker.app</span><button className="mini">복사</button></div>
        </div>
      </section>

      <footer>Digital Sub Fee Tracker alpha</footer>
    </main>
  );
}
