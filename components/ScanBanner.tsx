'use client';
import { useRef, useState } from 'react';
import { SYM } from '@/lib/fx';
import { useLang } from '@/lib/i18n';
import { scanImage, type ScanItem } from '@/lib/scan';
import { useStore, type SubRow, type Cat } from '@/lib/store';

const CAT_KEY: Record<Cat, string> = {
  ai: 'catAi', dev: 'catDev', ent: 'catEnt', sto: 'catSto', etc: 'catEtc',
};

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

/** 사진 업로드 → Gemini 인식 → [등록]=즉시 저장 / [편집]=모달 프리필 */
export default function ScanBanner() {
  const { openDraft, addSub } = useStore();
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);

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

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setNotice(null); setItems([]);
    try {
      const r = await scanImage(f);
      setItems(r);
      if (!r.length) setNotice(t('scanNotFound'));
    } catch (err) {
      console.error('스캔 실패:', err);
      const detail = (err as Error)?.message?.slice(0, 140) ?? '?';
      setNotice(t('scanFailed', { d: detail }));
    } finally {
      setBusy(false);
    }
  };

  const drop = (it: ScanItem) => setItems(p => p.filter(x => x !== it));
  const registerNow = async (it: ScanItem, idx: number) => {
    setSavingIdx(idx);
    const ok = await addSub(toSub(it));
    setSavingIdx(null);
    if (ok) drop(it);            // 실패 시 카드 유지 (알림은 store가 표시)
  };
  const edit = (it: ScanItem) => {
    const s = toSub(it);
    openDraft({ name: s.name, amt: s.amt, c: s.c, cycle: s.cycle, cat: s.cat, anchor: s.anchor });
    drop(it);
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
      <div className="sec-head"><h2>{t('scanTitle')}</h2><span className="hint">{t('scanHint')}</span></div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <button className="scan-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? t('scanning') : t('scanBtn')}
      </button>
      {notice && <div className="scan-notice">{notice}</div>}
      {items.map((it, i) => (
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
            <button className="mini ghost" disabled={savingIdx !== null} onClick={() => drop(it)}>{t('dismiss')}</button>
          </span>
        </div>
      ))}
    </section>
  );
}
