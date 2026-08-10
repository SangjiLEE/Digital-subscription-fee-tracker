'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';

const WKEY = 'dsftWelcomeHideUntil';
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** 첫 방문 웰컴 팝업. 로그인 유저에게는 절대 표시하지 않는다. */
export default function WelcomeModal() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || user) return;          // 세션 복원 중이거나 로그인 유저 → 표시 안 함
    let hideUntil = 0;
    try { hideUntil = +(localStorage.getItem(WKEY) ?? 0); } catch {}
    if (Date.now() > hideUntil) setOpen(true);
  }, [user, loading]);

  if (user || !open) return null;         // 세션 중 로그인해도 즉시 사라짐

  const skipWeek = () => {
    try { localStorage.setItem(WKEY, String(Date.now() + WEEK)); } catch {}
    setOpen(false);
  };

  return (
    <div className="overlay center" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="modal welcome-card" role="dialog" aria-modal="true" aria-labelledby="wTitle">
        <div className="w-mark">Digital Sub Fee Tracker</div>
        <h3 className="w-title" id="wTitle">{t('wTitle1')}<br />{t('wTitle2')}</h3>
        <p className="w-desc">{t('wDesc')}</p>
        <button className="m-save" onClick={() => setOpen(false)}>{t('wStart')}</button>
        <button className="w-skip" onClick={skipWeek}>{t('wSkip')}</button>
      </div>
    </div>
  );
}
