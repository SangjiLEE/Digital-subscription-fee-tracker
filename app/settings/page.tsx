'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useStore, type Region } from '@/lib/store';
import { SYM } from '@/lib/fx';
import type { Currency } from '@/lib/types';

const ORDER: Currency[] = ['JPY', 'USD', 'KRW'];
const CUR_LABEL: Record<Currency, string> = { JPY: '엔 (JPY)', USD: '달러 (USD)', KRW: '원 (KRW)' };

/**
 * 설정. "준비 중" 표시는 인프라(다국어·메일 발송·다지역 카탈로그)가
 * 필요한 기능 — 가짜 컨트롤 대신 상태를 정직하게 노출한다.
 */
export default function SettingsPage() {
  const { cur, setCur, region, setRegion, renewAlert, setRenewAlert } = useStore();
  const [curOpen, setCurOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const REGIONS: [Region, string][] = [['JP', '일본 (JP)'], ['KR', '한국 (KR)'], ['US', '미국 (US)']];
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';

  return (
    <main>
      <section>
        <div className="sec-head"><h2>표시</h2></div>
        <div className="set-card">
          <button className="set-row set-btn" onClick={() => setCurOpen(v => !v)}
            aria-expanded={curOpen} aria-label={`표시 통화 선택 (현재 ${cur})`}>
            표시 통화
            <span className="set-val">{SYM[cur]} {CUR_LABEL[cur]} {curOpen ? '⌄' : '›'}</span>
          </button>
          {curOpen && (
            <div className="cur-options">
              <div className="seg">
                {ORDER.map(c => (
                  <button key={c} className={cur === c ? 'on' : ''}
                    onClick={() => { setCur(c); setCurOpen(false); }}>
                    {SYM[c]} {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="set-row dim">UI 언어<span className="set-val">한국어<i className="soon">준비 중</i></span></div>
          <button className="set-row set-btn" onClick={() => setRegionOpen(v => !v)}
            aria-expanded={regionOpen} aria-label={`가격 참조 지역 선택 (현재 ${region})`}>
            가격 참조 지역
            <span className="set-val">{REGIONS.find(r => r[0] === region)?.[1]} {regionOpen ? '⌄' : '›'}</span>
          </button>
          {regionOpen && (
            <div className="cur-options">
              <div className="seg">
                {REGIONS.map(([r, label]) => (
                  <button key={r} className={region === r ? 'on' : ''}
                    onClick={() => { setRegion(r); setRegionOpen(false); }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="set-row">타임존<span className="set-val">{tz} <i className="soon">자동</i></span></div>
        </div>
        <p className="set-note">표시 통화는 홈의 ₩/¥/$ 토글과 연동되고, 가격 참조 지역은 구독 등록 시 카탈로그 참고가에 사용돼요. 모두 이 기기에 저장됩니다.</p>
      </section>

      <section>
        <div className="sec-head"><h2>알림</h2></div>
        <div className="set-card">
          <div className="set-row">갱신 임박 알림 (앱 내)
            <span className="set-val">
              <button className="switch" role="switch" aria-checked={renewAlert}
                aria-label="갱신 임박 알림" onClick={() => setRenewAlert(!renewAlert)} />
            </span>
          </div>
          <div className="set-row dim">주간 요약 메일<span className="set-val"><i className="soon">준비 중</i></span></div>
        </div>
        <p className="set-note">갱신 임박 알림은 3일 내 갱신 예정이 있을 때 홈 상단에 표시돼요.
          메일 알림은 발송 서버(유료 플랜)가 필요해 준비 중입니다.</p>
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
