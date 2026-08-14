'use client';
import { useLang } from '@/lib/i18n';
import { useStore } from '@/lib/store';

/** 전역 토스트 + 인앱 확인 다이얼로그 — 브라우저 confirm()/alert() 대체 */
export default function Feedback() {
  const { toast, dismissToast, confirmReq, answerConfirm } = useStore();
  const { t } = useLang();

  return (
    <>
      {confirmReq && (
        <div className="overlay center confirm-overlay"
          onClick={e => { if (e.target === e.currentTarget) answerConfirm(false); }}>
          <div className="modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={confirmReq.msg}>
            <p>{confirmReq.msg}</p>
            <div className="c-actions">
              <button className="c-cancel" onClick={() => answerConfirm(false)}>{t('cancelBtn')}</button>
              <button className={`c-ok ${confirmReq.danger ? 'danger' : ''}`} autoFocus
                onClick={() => answerConfirm(true)}>{confirmReq.okLabel}</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className={`toast ${toast.kind}`} role="status">
          <span>{toast.msg}</span>
          {toast.undo && (
            <button onClick={() => { toast.undo!(); dismissToast(); }}>{t('undo')}</button>
          )}
        </div>
      )}
    </>
  );
}
