'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LANG_NAME, useLang, type Lang } from '@/lib/i18n';
import { useStore, type Region } from '@/lib/store';
import { SYM } from '@/lib/fx';
import type { Currency } from '@/lib/types';

const CURS: Currency[] = ['JPY', 'USD', 'KRW'];
const LANGS: Lang[] = ['ko', 'ja', 'en'];
const REGIONS: Region[] = ['JP', 'KR', 'US'];

/**
 * 설정. "준비 중"은 발송/수신 서버 인프라가 필요한 기능 —
 * 가짜 컨트롤 대신 상태를 정직하게 노출한다.
 */
export default function SettingsPage() {
  const { cur, setCur, region, setRegion, renewAlert, setRenewAlert } = useStore();
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState<'cur' | 'lang' | 'region' | null>(null);
  const toggle = (k: 'cur' | 'lang' | 'region') => setOpen(v => (v === k ? null : k));
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';

  return (
    <main>
      <section>
        <div className="sec-head"><h2>{t('secDisplay')}</h2></div>
        <div className="set-card">
          <button className="set-row set-btn" onClick={() => toggle('cur')}
            aria-expanded={open === 'cur'} aria-label={t('dispCur')}>
            {t('dispCur')}
            <span className="set-val">{SYM[cur]} {t(`cur${cur}`)} {open === 'cur' ? '⌄' : '›'}</span>
          </button>
          {open === 'cur' && (
            <div className="cur-options">
              <div className="seg">
                {CURS.map(c => (
                  <button key={c} className={cur === c ? 'on' : ''}
                    onClick={() => { setCur(c); setOpen(null); }}>
                    {SYM[c]} {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="set-row set-btn" onClick={() => toggle('lang')}
            aria-expanded={open === 'lang'} aria-label={t('uiLang')}>
            {t('uiLang')}
            <span className="set-val">{LANG_NAME[lang]} {open === 'lang' ? '⌄' : '›'}</span>
          </button>
          {open === 'lang' && (
            <div className="cur-options">
              <div className="seg">
                {LANGS.map(l => (
                  <button key={l} className={lang === l ? 'on' : ''}
                    onClick={() => { setLang(l); setOpen(null); }}>
                    {LANG_NAME[l]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="set-row set-btn" onClick={() => toggle('region')}
            aria-expanded={open === 'region'} aria-label={t('priceRegion')}>
            {t('priceRegion')}
            <span className="set-val">{t(`region${region}`)} {open === 'region' ? '⌄' : '›'}</span>
          </button>
          {open === 'region' && (
            <div className="cur-options">
              <div className="seg">
                {REGIONS.map(r => (
                  <button key={r} className={region === r ? 'on' : ''}
                    onClick={() => { setRegion(r); setOpen(null); }}>
                    {t(`region${r}`)}
                  </button>
                ))}
              </div>
            </div>
          )}
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
