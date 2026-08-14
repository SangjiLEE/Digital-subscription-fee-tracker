'use client';
import { useState } from 'react';
import { SYM } from '@/lib/fx';
import { useLang } from '@/lib/i18n';
import type { ScanItem } from '@/lib/scan';
import { useStore, CAT_KEY, type SubRow } from '@/lib/store';

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 인식된 chargeDate가 미래(다음 갱신일)면 한 주기 전으로 되돌려 anchor로 사용 */
function toAnchor(it: ScanItem): string | undefined {
  if (!it.chargeDate) return undefined;
  const d = new Date(it.chargeDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return undefined;
  if (d > new Date()) {
    if (it.cycle === 'year') d.setFullYear(d.getFullYear() - 1);
    else d.setMonth(d.getMonth() - 1);
  }
  return fmtDate(d);
}

/**
 * 사진 인식 결과 표시 — 인식 중이거나 결과·안내가 있을 때만 나타난다.
 * 업로드 시작은 + 버튼 메뉴(TabNav)에서.
 */
export default function ScanBanner() {
  const { openDraft, addSub, scanItems, dropScanItem, showToast } = useStore();
  const { t } = useLang();
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

  if (!scanItems.length) return null;   // 진행·실패 표시는 전역 오버레이(ScanOverlay)

  /** 스캔 결과 → 저장용 SubRow (id 제외) */
  const toSub = (it: ScanItem): Omit<SubRow, 'id'> => {
    const anchor = toAnchor(it) ?? fmtDate(new Date());
    const nm = new Date(anchor + 'T00:00:00');
    nm.setMonth(nm.getMonth() + (it.cycle === 'year' ? 12 : 1));
    const next = it.cycle === 'year'
      ? `${nm.getFullYear()}/${nm.getMonth() + 1}/${nm.getDate()}`
      : `${nm.getMonth() + 1}/${nm.getDate()}`;
    return {
      name: it.name, plan: '', amt: it.amount, c: it.currency,
      cat: it.cat, cycle: it.cycle, next, anchor, renew: 'auto',
      init: it.name[0].toUpperCase(),
    };
  };

  const registerNow = async (it: ScanItem, idx: number) => {
    setSavingIdx(idx);
    const ok = await addSub(toSub(it));
    setSavingIdx(null);
    if (ok) {
      dropScanItem(it);    // 실패 시 카드 유지 (알림은 store가 표시)
      showToast(t('addedToast', { name: it.name }));
    }
  };
  const edit = (it: ScanItem) => {
    const s = toSub(it);
    openDraft({ name: s.name, amt: s.amt, c: s.c, cycle: s.cycle, cat: s.cat, anchor: s.anchor });
    dropScanItem(it);
  };

  const renewLabel = (it: ScanItem) => {
    if (!it.chargeDate) return null;
    const d = new Date(it.chargeDate + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return null;
    const md = `${d.getMonth() + 1}/${d.getDate()}`;
    return d > new Date() ? t('renewOn', { d: md }) : t('paidOn', { d: md });
  };

  return (
    <section>
      <div className="sec-head"><h2>{t('scanTitle')}</h2><span className="hint">{t('scanPrivacy')}</span></div>
      {scanItems.map((it, i) => (
        <div className="inbox-banner scan-item" key={`${it.name}-${i}`}>
          <span>
            <b>{it.name}</b> · {SYM[it.currency]}{it.amount.toLocaleString()}
            {' · '}{it.cycle === 'year' ? t('yearly') : t('monthly')} · {t(CAT_KEY[it.cat] ?? 'catEtc')}
            {renewLabel(it) && <> · {renewLabel(it)}</>}
            <small className="scan-conf"> {t('confidence', { p: Math.round(it.confidence * 100) })}</small>
          </span>
          <span className="scan-acts">
            <button className="mini" disabled={savingIdx !== null}
              onClick={() => registerNow(it, i)}>
              {savingIdx === i ? t('adding') : t('register')}
            </button>
            <button className="mini ghost" disabled={savingIdx !== null} onClick={() => edit(it)}>{t('edit')}</button>
            <button className="mini ghost" disabled={savingIdx !== null} onClick={() => dropScanItem(it)}>{t('dismiss')}</button>
          </span>
        </div>
      ))}
    </section>
  );
}
