'use client';
import { useLang } from '@/lib/i18n';
import { useStore } from '@/lib/store';

/** 사진 인식 진행·실패 오버레이 — 어느 화면에서든 화면 중앙에 표시 */
export default function ScanOverlay() {
  const { scanBusy, scanNotice, cancelScan, retryScan, setModalOpen } = useStore();
  const { t } = useLang();
  if (!scanBusy && !scanNotice) return null;

  return (
    <div className="overlay center scan-overlay" role="alert" aria-busy={scanBusy}>
      <div className="modal scan-card">
        {scanBusy ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <div className="sc-title">{t('scanning')}</div>
            <div className="sc-desc">{t('scanPrivacy')}</div>
            <button className="mini ghost" onClick={cancelScan}>{t('cancelBtn')}</button>
          </>
        ) : (
          <>
            <span className="sc-icon" aria-hidden="true">⚠️</span>
            <div className="sc-desc sc-error">{scanNotice}</div>
            <div className="sc-btns">
              <button className="mini" onClick={retryScan}>{t('retry')}</button>
              <button className="mini ghost" onClick={() => { cancelScan(); setModalOpen(true); }}>{t('enterManually')}</button>
              <button className="mini ghost" onClick={cancelScan}>{t('cancelBtn')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
