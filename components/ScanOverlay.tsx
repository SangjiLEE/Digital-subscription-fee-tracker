'use client';
import { useLang } from '@/lib/i18n';
import { useStore } from '@/lib/store';

/** 사진 인식 진행 오버레이 — 어느 화면에서든 화면 중앙에 표시 */
export default function ScanOverlay() {
  const { scanBusy, cancelScan } = useStore();
  const { t } = useLang();
  if (!scanBusy) return null;
  return (
    <div className="overlay center scan-overlay" role="alert" aria-busy="true">
      <div className="modal scan-card">
        <span className="spinner" aria-hidden="true" />
        <div className="sc-title">{t('scanning')}</div>
        <div className="sc-desc">{t('scanPrivacy')}</div>
        <button className="mini ghost" onClick={cancelScan}>{t('cancelBtn')}</button>
      </div>
    </div>
  );
}
