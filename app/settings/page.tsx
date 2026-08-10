'use client';
import Link from 'next/link';
import { LANG_NAME, useLang, type Lang } from '@/lib/i18n';
import { useStore, type Region } from '@/lib/store';
import { SYM } from '@/lib/fx';
import type { Currency } from '@/lib/types';

const CURS: Currency[] = ['JPY', 'USD', 'KRW'];
const LANGS: Lang[] = ['ko', 'ja', 'en'];
const REGIONS: Region[] = ['JP', 'KR', 'US'];

/**
 * 설정. 선택형 항목은 전부 네이티브 드롭다운으로 통일.
 * "준비 중"은 발송/수신 서버 인프라가 필요한 기능 — 상태를 정직하게 노출.
 */
export default function SettingsPage() {
  const { cur, setCur, region, setRegion, renewAlert, setRenewAlert } = useStore();
  const { lang, setLang, t } = useLang();
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';

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

      <footer>Digital Sub Fee Tracker alpha</footer>
    </main>
  );
}
