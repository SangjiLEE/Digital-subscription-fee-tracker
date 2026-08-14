'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LANG_NAME, useLang, type Lang } from '@/lib/i18n';
import { useStore, CAT_KEY, type Region } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { deleteAccount } from '@/lib/account';
import { useMounted } from '@/lib/useMounted';
import { SYM } from '@/lib/fx';
import type { Currency } from '@/lib/types';

/** 쉼표·따옴표·줄바꿈이 있어도 안전한 CSV 필드 */
const csvField = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

const CURS: Currency[] = ['JPY', 'USD', 'KRW'];
const LANGS: Lang[] = ['ko', 'ja', 'en'];
const REGIONS: Region[] = ['JP', 'KR', 'US'];

/**
 * 설정. 선택형 항목은 전부 네이티브 드롭다운으로 통일.
 * "준비 중"은 발송/수신 서버 인프라가 필요한 기능 — 상태를 정직하게 노출.
 */
export default function SettingsPage() {
  const { cur, setCur, region, setRegion, renewAlert, setRenewAlert,
    subs, oneTime, askConfirm, showToast } = useStore();
  const { lang, setLang, t } = useLang();
  const { user } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
  const mounted = useMounted();

  /** 구독 + 일회성 지출 전체 → CSV 다운로드 (BOM 포함 — Excel 한글 호환) */
  const exportCsv = () => {
    if (!subs.length && !oneTime.length) { showToast(t('exportEmpty'), { kind: 'err' }); return; }
    const head = ['type', 'name', 'plan', 'category', 'amount', 'currency', 'cycle', 'status', 'firstDate', 'endDate', 'note'];
    const rows = [
      ...subs.map(s => ['subscription', s.name, s.plan, t(CAT_KEY[s.cat]), s.amt, s.c,
        s.cycle, s.status ?? 'active', s.anchor ?? '', s.endDate ?? '', '']),
      ...oneTime.map(o => ['one-time', o.name, '', t('catEtc'), o.amt, o.c, '', '', o.date ?? '', '', o.note]),
    ];
    const csv = [head, ...rows].map(r => r.map(csvField).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sub-fee-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('exportDone'));
  };

  const doDeleteAccount = async () => {
    if (deleting) return;
    if (!(await askConfirm(t('deleteAccountMsg'), t('deleteAccountBtn'), true))) return;
    setDeleting(true);
    try {
      await deleteAccount();
      try { localStorage.removeItem('hasAuthed'); } catch {}
      showToast(t('deleteAccountDone'));
      router.push('/');
    } catch (e) {
      console.error('계정 삭제 실패:', (e as { code?: string })?.code);
      showToast(t('opFail'), { kind: 'err' });
    } finally {
      setDeleting(false);
    }
  };

  if (!mounted) return <main><div className="page-skel" aria-hidden="true"><i /><i /><i /></div></main>;

  return (
    <main>
      <section>
        <div className="sec-head"><h2>{t('secDisplay')}</h2></div>
        <div className="set-card">
          <label className="set-row">{t('dispCur')}
            <select className="set-select" value={cur} aria-label={t('dispCur')}
              onChange={e => setCur(e.target.value as Currency)}>
              {CURS.map(c => <option key={c} value={c}>{SYM[c]} {t(`cur${c}`)}</option>)}
            </select>
          </label>
          <label className="set-row">{t('uiLang')}
            <select className="set-select" value={lang} aria-label={t('uiLang')}
              onChange={e => setLang(e.target.value as Lang)}>
              {LANGS.map(l => <option key={l} value={l}>{LANG_NAME[l]}</option>)}
            </select>
          </label>
          <label className="set-row">{t('priceRegion')}
            <select className="set-select" value={region} aria-label={t('priceRegion')}
              onChange={e => setRegion(e.target.value as Region)}>
              {REGIONS.map(r => <option key={r} value={r}>{t(`region${r}`)}</option>)}
            </select>
          </label>
          <div className="set-row">{t('timezone')}<span className="set-val">{tz} <i className="soon">{t('autoBadge')}</i></span></div>
        </div>
        <p className="set-note">{t('noteDisplay')}</p>
      </section>

      <section>
        <div className="sec-head"><h2>{t('secAlarm')}</h2></div>
        <div className="set-card">
          <div className="set-row">{t('renewAlertL')}
            <span className="set-val">
              <button className="switch" role="switch" aria-checked={renewAlert}
                aria-label={t('renewAlertL')} onClick={() => setRenewAlert(!renewAlert)} />
            </span>
          </div>
          <div className="set-row dim">{t('weeklyMail')}<span className="set-val"><i className="soon">{t('soon')}</i></span></div>
        </div>
        <p className="set-note">{t('noteAlarm')}</p>
      </section>

      <section>
        <div className="sec-head"><h2>{t('secReceipt')}</h2></div>
        <div className="set-card">
          <div className="set-row dim">{t('mailFwd')}<span className="set-val"><i className="soon">{t('soon')}</i></span></div>
        </div>
        <p className="set-note">
          <Link href="/list" className="set-link">{t('noteReceiptLink')}</Link> — {t('noteReceipt')}
        </p>
      </section>

      <section>
        <div className="sec-head"><h2>{t('secData')}</h2></div>
        <div className="set-card">
          <button className="set-row set-action" onClick={exportCsv}>
            {t('exportCsv')}<span className="set-val">⬇︎</span>
          </button>
        </div>
        <p className="set-note">{t('noteData')}</p>
      </section>

      {user && (
        <section>
          <div className="sec-head"><h2>{t('secAccount')}</h2></div>
          <div className="set-card">
            <button className="set-row set-action danger" onClick={doDeleteAccount} disabled={deleting}>
              {deleting ? t('saving') : t('deleteAccount')}
            </button>
          </div>
          <p className="set-note">{t('noteAccount')}</p>
        </section>
      )}

      <footer>Digital Sub Fee Tracker alpha</footer>
    </main>
  );
}
