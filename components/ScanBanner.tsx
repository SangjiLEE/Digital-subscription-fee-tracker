'use client';
import { useRef, useState } from 'react';
import { SYM } from '@/lib/fx';
import { scanImage, type ScanItem } from '@/lib/scan';
import { useStore, CATNAME } from '@/lib/store';

/** 사진 업로드 → Gemini 인식 → 확인 대기 카드 → 등록 모달 프리필 */
export default function ScanBanner() {
  const { openDraft } = useStore();
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
      setNotice('인식에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  };

  const confirm = (it: ScanItem) => {
    openDraft({
      name: it.name, amt: it.amount, c: it.currency,
      cycle: it.cycle, cat: it.cat, anchor: it.chargeDate,
    });
    setItems(p => p.filter(x => x !== it));
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
            <small className="scan-conf"> 확신도 {Math.round(it.confidence * 100)}%</small>
          </span>
          <span className="scan-acts">
            <button className="mini" onClick={() => confirm(it)}>등록</button>
            <button className="mini ghost" onClick={() => setItems(p => p.filter(x => x !== it))}>무시</button>
          </span>
        </div>
      ))}
    </section>
  );
}
