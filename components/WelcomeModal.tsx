'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

const WKEY = 'subfolioWelcomeHideUntil';
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** 첫 방문 웰컴 팝업. 로그인 유저에게는 절대 표시하지 않는다. */
export default function WelcomeModal() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) return;                     // 로그인 유저 → 표시 안 함
    let hideUntil = 0;
    try { hideUntil = +(localStorage.getItem(WKEY) ?? 0); } catch {}
    if (Date.now() > hideUntil) setOpen(true);
  }, [user]);

  if (user || !open) return null;         // 세션 중 로그인해도 즉시 사라짐

  const skipWeek = () => {
    try { localStorage.setItem(WKEY, String(Date.now() + WEEK)); } catch {}
    setOpen(false);
  };

  return (
    <div className="overlay center" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="modal welcome-card" role="dialog" aria-modal="true" aria-labelledby="wTitle">
        <div className="w-mark">Subfolio</div>
        <h3 className="w-title" id="wTitle">디지털 구독료,<br />얼마인지 알고 계신가요?</h3>
        <p className="w-desc">넷플릭스부터 AI 구독까지 — 매달 나가는 돈과 갱신 일정을 한눈에. 지금 관리하세요!</p>
        <button className="m-save" onClick={() => setOpen(false)}>시작하기</button>
        <button className="w-skip" onClick={skipWeek}>일주일 동안 표시하지 않기</button>
      </div>
    </div>
  );
}
