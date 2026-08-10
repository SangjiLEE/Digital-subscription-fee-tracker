'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SYM } from '@/lib/fx';
import { useStore, type Cat } from '@/lib/store';
import type { Currency } from '@/lib/types';

interface CatalogPlan { n: string; amt: number; c: Currency; }
interface CatalogSvc { name: string; cat: Cat; plans: CatalogPlan[]; }

/** 목업용 미니 카탈로그. 실서비스는 data/catalog-seed.json → Firestore services/ */
const MINICAT: CatalogSvc[] = [
  { name: 'Claude',  cat: 'ai',  plans: [{ n: 'Pro', amt: 20, c: 'USD' }, { n: 'Max 5x', amt: 100, c: 'USD' }] },
  { name: 'ChatGPT', cat: 'ai',  plans: [{ n: 'Go', amt: 1400, c: 'JPY' }, { n: 'Plus', amt: 3000, c: 'JPY' }] },
  { name: 'Netflix', cat: 'ent', plans: [{ n: '광고형 스탠다드', amt: 890, c: 'JPY' }, { n: '스탠다드', amt: 1590, c: 'JPY' }, { n: '프리미엄', amt: 2290, c: 'JPY' }] },
  { name: 'Spotify', cat: 'ent', plans: [{ n: 'Standard', amt: 1080, c: 'JPY' }, { n: 'Duo', amt: 1480, c: 'JPY' }] },
  { name: 'iCloud+', cat: 'sto', plans: [{ n: '50GB', amt: 150, c: 'JPY' }, { n: '2TB', amt: 1500, c: 'JPY' }] },
  { name: 'Notion',  cat: 'dev', plans: [{ n: 'Plus', amt: 12, c: 'USD' }] },
];

type CycleV = 'month' | 'year';
type RenewV = 'auto' | 'manual' | 'one';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AddModal() {
  const { modalOpen, setModalOpen, addSub, addOneTime, editing, updateSub, draft } = useStore();
  const router = useRouter();

  const [name, setName] = useState('');
  const [svc, setSvc] = useState<CatalogSvc | null>(null);
  const [plan, setPlan] = useState<CatalogPlan | null>(null);
  const [amt, setAmt] = useState('');
  const [curSel, setCurSel] = useState<Currency>('JPY');
  const [cycle, setCycle] = useState<CycleV>('month');
  const [renew, setRenew] = useState<RenewV>('auto');
  const [date, setDate] = useState(todayStr());

  // 수정 모드: 대상 구독으로 폼 프리필
  useEffect(() => {
    if (editing && modalOpen) {
      setName(editing.name);
      setAmt(String(editing.amt));
      setCurSel(editing.c);
      setCycle(editing.cycle);
      setRenew(editing.renew === 'manual' || editing.plan.includes('수동갱신') ? 'manual' : 'auto');
      setDate(editing.anchor ?? todayStr());
      setSvc(null); setPlan(null);
    }
  }, [editing, modalOpen]);

  // 사진 인식 결과 프리필
  useEffect(() => {
    if (draft && modalOpen && !editing) {
      if (draft.name) setName(draft.name);
      if (draft.amt) setAmt(String(draft.amt));
      if (draft.c) setCurSel(draft.c);
      if (draft.cycle) setCycle(draft.cycle);
      if (draft.anchor) setDate(draft.anchor);
      setRenew('auto'); setSvc(null); setPlan(null);
    }
  }, [draft, modalOpen, editing]);

  if (!modalOpen) return null;

  const chips = MINICAT.filter(s => s.name.toLowerCase().includes(name.toLowerCase()));

  const reset = () => {
    setName(''); setSvc(null); setPlan(null); setAmt('');
    setCurSel('JPY'); setCycle('month'); setRenew('auto'); setDate(todayStr());
  };
  const close = () => { setModalOpen(false); reset(); };

  const pickSvc = (s: CatalogSvc) => { setSvc(s); setPlan(null); setName(s.name); };
  const pickPlan = (p: CatalogPlan) => { setPlan(p); setAmt(String(p.amt)); setCurSel(p.c); };

  const save = () => {
    const amount = parseFloat(amt);
    if (!name.trim() || !amount) { alert('서비스명과 금액을 입력해주세요'); return; }
    const d = new Date(date + 'T00:00:00');
    if (renew === 'one') {
      addOneTime({ name: name.trim(), note: `${d.getMonth() + 1}/${d.getDate()} 결제`,
        amt: amount, c: curSel, init: name.trim()[0].toUpperCase() });
      close(); router.push('/list');
      return;
    }
    const nm = new Date(d);
    nm.setMonth(nm.getMonth() + (cycle === 'year' ? 12 : 1)); // TODO: D7 월말 클램프
    const next = cycle === 'year'
      ? `${nm.getFullYear()}/${nm.getMonth() + 1}/${nm.getDate()}`   // 연결제는 연도 표기
      : `${nm.getMonth() + 1}/${nm.getDate()}`;
    const base = {
      name: name.trim(), amt: amount, c: curSel, cycle, next,
      anchor: date, renew: renew === 'manual' ? 'manual' as const : 'auto' as const,
      init: name.trim()[0].toUpperCase(),
    };
    if (editing) {
      updateSub(editing.id, {
        ...base,
        plan: plan ? plan.n : editing.plan.replace(' · 수동갱신', ''),
        cat: svc ? svc.cat : editing.cat,
      });
    } else {
      addSub({ ...base, plan: plan ? plan.n : '커스텀', cat: svc ? svc.cat : (draft?.cat ?? 'etc') });
    }
    close(); router.push('/list');
  };

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">
        <div className="m-head">
          <h3 id="mTitle">{editing ? '구독 수정' : '구독 등록'}</h3>
          <button className="m-close" onClick={close} aria-label="닫기">×</button>
        </div>

        <div className="fld">
          <label htmlFor="fName">서비스</label>
          <input id="fName" type="text" placeholder="이름 검색 또는 직접 입력" autoComplete="off"
            value={name} onChange={e => { setName(e.target.value); setSvc(null); setPlan(null); }} />
          <div className="chips">
            {chips.map(s => (
              <button key={s.name} className={`chip ${svc?.name === s.name ? 'on' : ''}`}
                onClick={() => pickSvc(s)}>{s.name}</button>
            ))}
          </div>
          {svc && (
            <div className="chips">
              {svc.plans.map(p => (
                <button key={p.n} className={`chip ${plan?.n === p.n ? 'on' : ''}`}
                  onClick={() => pickPlan(p)}>
                  {p.n} <small>{SYM[p.c]}{p.amt.toLocaleString()}</small>
                </button>
              ))}
            </div>
          )}
          {plan && <div className="ref-note">참고가로 채웠어요 (JP 기준) · 실제 청구액과 다르면 수정하세요</div>}
        </div>

        <div className="fld">
          <label htmlFor="fAmt">금액</label>
          <div className="amt-row">
            <input id="fAmt" type="number" min={0} placeholder="0" inputMode="decimal"
              value={amt} onChange={e => setAmt(e.target.value)} />
            <select aria-label="통화" value={curSel}
              onChange={e => setCurSel(e.target.value as Currency)}>
              <option>JPY</option><option>USD</option><option>KRW</option>
            </select>
          </div>
        </div>

        <div className={`fld ${renew === 'one' ? 'off' : ''}`}>
          <label>결제 주기</label>
          <div className="seg">
            {(['month', 'year'] as CycleV[]).map(v => (
              <button key={v} className={cycle === v ? 'on' : ''}
                onClick={() => setCycle(v)}>{v === 'month' ? '매월' : '매년'}</button>
            ))}
          </div>
        </div>

        <div className="fld">
          <label htmlFor="fDate">최초 결제일</label>
          <input id="fDate" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="fld">
          <label>갱신 유형</label>
          <div className="seg">
            {(([['auto', '자동갱신'], ['manual', '수동갱신'], ['one', '일회성']] as [RenewV, string][])
              .filter(([v]) => !editing || v !== 'one')).map(([v, l]) => (
              <button key={v} className={renew === v ? 'on' : ''}
                onClick={() => setRenew(v)}>{l}</button>
            ))}
          </div>
        </div>

        <button className="m-save" onClick={save}>{editing ? '수정 저장' : '등록'}</button>
      </div>
    </div>
  );
}
