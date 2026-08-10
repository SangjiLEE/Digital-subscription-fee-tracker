'use client';
import { useRef, useState } from 'react';
import { SYM } from '@/lib/fx';
import { scanImage, type ScanItem } from '@/lib/scan';
import { useStore, CATNAME, type SubRow } from '@/lib/store';

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

/** 스캔 결과 → 저장용 SubRow (id 제외) */
function toSub(it: ScanItem): Omit<SubRow, 'id'> {
  const anchor = toAnchor(it) ?? fmtDate(new Date());
  const nm = new Date(anchor + 'T00:00:00');
  nm.setMonth(nm.getMonth() + (it.cycle === 'year' ? 12 : 1));
  const next = it.cycle === 'year'
    ? `${nm.getFullYear()}/${nm.getMonth() + 1}/${nm.getDate()}`
    : `${nm.getMonth() + 1}/${nm.getDate()}`;
  return {
    name: it.name, plan: '커스텀', amt: it.amount, c: it.currency,
    cat: it.cat, cycle: it.cycle, next, anchor, renew: 'auto',
    init: it.name[0].toUpperCase(),
  };
}

/** 사진 업로드 → Gemini 인식 → [등록]=즉시 저장 / [편집]=모달 프리필 */
export default function ScanBanner() {
  const { openDraft, addSub } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true); setNotice(null); setItems([]);
    try {
      const r = await scanImage(f);
      setItems(r);
      if (!r.length) setNotice('사진에서 구독 정보를 찾지 못했어요. 금액·서비스명이 보이게 다시 찍어보세요.');
    } catch (err) {
      console.error('스캔 실패:', err);
      const detail = (err as Error)?.message?.slice(0, 140) ?? '알 수 없는 오류';
      setNotice(`인식에 실패했어요. 잠시 후 다시 시도해주세요.\n(${detail})`);
    } finally {
      setBusy(false);
    }
  };

  const drop = (it: ScanItem) => setItems(p => p.filter(x => x !== it));
  const registerNow = (it: ScanItem) => { addSub(toSub(it)); drop(it); };
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
    return d > new Date() ? `갱신 ${md}` : `결제일 ${md}`;
  };

  return (
    <section>
      <div className="sec-head"><h2>사진으로 추가</h2><span className="hint">영수증·구독 화면 인식</span></div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <button className="scan-btn" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? '인식 중…' : '📷 사진 올려서 자동 인식'}
      </button>
      {notice && <div className="scan-notice">{notice}</div>}
      {items.map((it, i) => (
        <div className="inbox-banner scan-item" key={`${it.name}-${i}`}>
          <span>
            <b>{it.name}</b> · {SYM[it.currency]}{it.amount.toLocaleString()}
            {' · '}{it.cycle === 'year' ? '연 결제' : '월 결제'} · {CATNAME[it.cat] ?? '기타'}
            {renewLabel(it) && <> · {renewLabel(it)}</>}
            <small className="scan-conf"> 확신도 {Math.round(it.confidence * 100)}%</small>
          </span>
          <span className="scan-acts">
            <button className="mini" onClick={() => registerNow(it)}>등록</button>
            <button className="mini ghost" onClick={() => edit(it)}>편집</button>
            <button className="mini ghost" onClick={() => drop(it)}>무시</button>
          </span>
        </div>
      ))}
    </section>
  );
}
