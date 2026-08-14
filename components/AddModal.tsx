'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SYM, fmt, toJPY } from '@/lib/fx';
import { useLang } from '@/lib/i18n';
import { useStore, isActive, CAT_ORDER, CAT_KEY, type Cat, type Region, type SubStatus } from '@/lib/store';
import type { Currency } from '@/lib/types';

interface CatalogPlan { n: string; amt: number; c: Currency; }
interface CatalogSvc { name: string; cat: Cat; plans: Record<Region, CatalogPlan[]>; }

/** 목업용 미니 카탈로그 (지역별 참고가). 실서비스는 data/catalog-seed.json → Firestore services/ */
const MINICAT: CatalogSvc[] = [
  { name: 'Claude', cat: 'ai', plans: {
    JP: [{ n: 'Pro', amt: 20, c: 'USD' }, { n: 'Max 5x', amt: 100, c: 'USD' }],
    KR: [{ n: 'Pro', amt: 20, c: 'USD' }, { n: 'Max 5x', amt: 100, c: 'USD' }],
    US: [{ n: 'Pro', amt: 20, c: 'USD' }, { n: 'Max 5x', amt: 100, c: 'USD' }],
  } },
  { name: 'ChatGPT', cat: 'ai', plans: {
    JP: [{ n: 'Go', amt: 1400, c: 'JPY' }, { n: 'Plus', amt: 3000, c: 'JPY' }],
    KR: [{ n: 'Plus', amt: 20, c: 'USD' }],
    US: [{ n: 'Plus', amt: 20, c: 'USD' }, { n: 'Pro', amt: 200, c: 'USD' }],
  } },
  { name: 'Netflix', cat: 'ent', plans: {
    JP: [{ n: '광고형 스탠다드', amt: 890, c: 'JPY' }, { n: '스탠다드', amt: 1590, c: 'JPY' }, { n: '프리미엄', amt: 2290, c: 'JPY' }],
    KR: [{ n: '광고형 스탠다드', amt: 7000, c: 'KRW' }, { n: '스탠다드', amt: 13500, c: 'KRW' }, { n: '프리미엄', amt: 17000, c: 'KRW' }],
    US: [{ n: 'Standard w/ ads', amt: 7.99, c: 'USD' }, { n: 'Standard', amt: 17.99, c: 'USD' }, { n: 'Premium', amt: 24.99, c: 'USD' }],
  } },
  { name: 'Spotify', cat: 'ent', plans: {
    JP: [{ n: 'Standard', amt: 1080, c: 'JPY' }, { n: 'Duo', amt: 1480, c: 'JPY' }],
    KR: [{ n: '개인', amt: 10900, c: 'KRW' }, { n: '듀오', amt: 16350, c: 'KRW' }],
    US: [{ n: 'Individual', amt: 11.99, c: 'USD' }, { n: 'Duo', amt: 16.99, c: 'USD' }],
  } },
  { name: 'iCloud+', cat: 'sto', plans: {
    JP: [{ n: '50GB', amt: 150, c: 'JPY' }, { n: '2TB', amt: 1500, c: 'JPY' }],
    KR: [{ n: '50GB', amt: 1100, c: 'KRW' }, { n: '2TB', amt: 11100, c: 'KRW' }],
    US: [{ n: '50GB', amt: 0.99, c: 'USD' }, { n: '2TB', amt: 9.99, c: 'USD' }],
  } },
  { name: 'Notion', cat: 'dev', plans: {
    JP: [{ n: 'Plus', amt: 12, c: 'USD' }],
    KR: [{ n: 'Plus', amt: 12, c: 'USD' }],
    US: [{ n: 'Plus', amt: 12, c: 'USD' }],
  } },
];

type CycleV = 'month' | 'year';
type RenewV = 'auto' | 'manual' | 'one';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AddModal() {
  const { modalOpen, setModalOpen, addSub, addOneTime, editing, updateSub, draft, region, cur,
    showToast, askConfirm } = useStore();
  const { t } = useLang();
  const router = useRouter();

  const [name, setName] = useState('');
  const [svc, setSvc] = useState<CatalogSvc | null>(null);
  const [plan, setPlan] = useState<CatalogPlan | null>(null);
  const [amt, setAmt] = useState('');
  const [curSel, setCurSel] = useState<Currency>('JPY');
  const [cycle, setCycle] = useState<CycleV>('month');
  const [renew, setRenew] = useState<RenewV>('auto');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [catSel, setCatSel] = useState<Cat>('etc');

  // 수정 모드: 대상 구독으로 폼 프리필
  useEffect(() => {
    if (editing && modalOpen) {
      setName(editing.name);
      setAmt(String(editing.amt));
      setCurSel(editing.c);
      setCycle(editing.cycle);
      setRenew(editing.renew === 'manual' || editing.plan.includes('수동갱신') ? 'manual' : 'auto');
      setDate(editing.anchor ?? todayStr());
      setCatSel(editing.cat);
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
      if (draft.cat) setCatSel(draft.cat);
      setRenew('auto'); setSvc(null); setPlan(null);
    }
  }, [draft, modalOpen, editing]);

  if (!modalOpen) return null;

  const amountNum = parseFloat(amt);
  const invalid = !name.trim() || !(amountNum > 0);

  const chips = MINICAT.filter(s => s.name.toLowerCase().includes(name.toLowerCase()));

  const reset = () => {
    setName(''); setSvc(null); setPlan(null); setAmt('');
    setCurSel('JPY'); setCycle('month'); setRenew('auto'); setDate(todayStr()); setCatSel('etc');
  };
  const close = () => { setModalOpen(false); reset(); };

  const pickSvc = (s: CatalogSvc) => { setSvc(s); setPlan(null); setName(s.name); setCatSel(s.cat); };
  const pickPlan = (p: CatalogPlan) => { setPlan(p); setAmt(String(p.amt)); setCurSel(p.c); };

  // 해지 / 일시정지 / 재개 — 편집 모드 전용 (기록 보존, 미래 청구만 중단)
  const setStatus = async (status: SubStatus) => {
    if (!editing || saving) return;
    if (status === 'canceled' &&
      !(await askConfirm(t('cancelSubMsg', { name: editing.name }), t('cancelSub'), true))) return;
    setSaving(true);
    const ok = await updateSub(editing.id,
      status === 'active' ? { status } : { status, endDate: todayStr() });
    setSaving(false);
    if (ok) {
      showToast(t(status === 'canceled' ? 'canceledToast' : status === 'paused' ? 'pausedToast' : 'resumedToast',
        { name: editing.name }));
      close();
    }
  };

  const save = async () => {
    if (saving) return;
    const amount = parseFloat(amt);
    if (!name.trim() || !amount) { showToast(t('validateMsg'), { kind: 'err' }); return; }
    const d = new Date(date + 'T00:00:00');
    if (renew === 'one') {
      setSaving(true);
      const ok = await addOneTime({ name: name.trim(), note: t('paidNote', { d: `${d.getMonth() + 1}/${d.getDate()}` }),
        amt: amount, c: curSel, init: name.trim()[0].toUpperCase(), date });
      setSaving(false);
      if (ok) { showToast(t('addedToast', { name: name.trim() })); close(); router.push('/list'); }
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
    setSaving(true);
    const ok = editing
      ? await updateSub(editing.id, {
          ...base,
          plan: plan ? plan.n : editing.plan.replace(' · 수동갱신', ''),
          cat: catSel,
        })
      : await addSub({ ...base, plan: plan ? plan.n : '', cat: catSel });
    setSaving(false);
    if (ok) {
      showToast(editing ? t('savedToast') : t('addedToast', { name: name.trim() }));
      close(); router.push('/list');
    }
  };

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">
        <div className="m-head">
          <h3 id="mTitle">{editing ? t('editTitle') : t('addTitle')}</h3>
          <button className="m-close" onClick={close} aria-label={t('close')}>×</button>
        </div>

        <div className="fld">
          <label htmlFor="fName">{t('service')}</label>
          <input id="fName" type="text" placeholder={t('searchPh')} autoComplete="off"
            value={name} onChange={e => { setName(e.target.value); setSvc(null); setPlan(null); }} />
          <div className="chips">
            {chips.map(s => (
              <button key={s.name} className={`chip ${svc?.name === s.name ? 'on' : ''}`}
                onClick={() => pickSvc(s)}>{s.name}</button>
            ))}
          </div>
          {svc && (
            <div className="chips">
              {svc.plans[region].map(p => (
                <button key={p.n} className={`chip ${plan?.n === p.n ? 'on' : ''}`}
                  onClick={() => pickPlan(p)}>
                  {p.n} <small>{SYM[p.c]}{p.amt.toLocaleString()}</small>
                </button>
              ))}
            </div>
          )}
          {plan && <div className="ref-note">{t('refNote', { r: region })}</div>}
        </div>

        <div className="fld">
          <label htmlFor="fAmt">{t('amount')}</label>
          <div className="amt-row">
            <input id="fAmt" type="number" min={0} placeholder="0" inputMode="decimal"
              value={amt} onChange={e => setAmt(e.target.value)} />
            <select aria-label="통화" value={curSel}
              onChange={e => setCurSel(e.target.value as Currency)}>
              <option>JPY</option><option>USD</option><option>KRW</option>
            </select>
          </div>
        </div>

        {renew !== 'one' && (
          <div className="fld">
            <label htmlFor="fCat">{t('category')}</label>
            <select id="fCat" className="cat-select" value={catSel}
              onChange={e => setCatSel(e.target.value as Cat)}>
              {CAT_ORDER.map(c => (
                <option key={c} value={c}>{t(CAT_KEY[c])}</option>
              ))}
            </select>
          </div>
        )}

        <div className={`fld ${renew === 'one' ? 'off' : ''}`}>
          <label>{t('cycle')}</label>
          <div className="seg">
            {(['month', 'year'] as CycleV[]).map(v => (
              <button key={v} className={cycle === v ? 'on' : ''} aria-pressed={cycle === v}
                onClick={() => setCycle(v)}>{v === 'month' ? t('everyMonth') : t('everyYear')}</button>
            ))}
          </div>
        </div>

        {cycle === 'year' && renew !== 'one' && amountNum > 0 && (
          <div className="ref-note">{t('monthlyEquiv', { v: fmt(toJPY(amountNum, curSel) / 12, cur) })}</div>
        )}

        <div className="fld">
          <label htmlFor="fDate">{t('firstDate')}</label>
          <input id="fDate" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="fld">
          <label>{t('renewType')}</label>
          <div className="seg">
            {(([['auto', t('autoRenew')], ['manual', t('manualRenew')], ['one', t('oneTimeOpt')]] as [RenewV, string][])
              .filter(([v]) => !editing || v !== 'one')).map(([v, l]) => (
              <button key={v} className={renew === v ? 'on' : ''} aria-pressed={renew === v}
                onClick={() => setRenew(v)}>{l}</button>
            ))}
          </div>
        </div>

        <button className="m-save" onClick={save} disabled={saving || invalid}>{saving ? t('saving') : editing ? t('saveEdit') : t('saveNew')}</button>

        {editing && (
          <div className="m-status">
            {isActive(editing) ? (
              <>
                <button onClick={() => setStatus('paused')} disabled={saving}>{t('pauseSub')}</button>
                <button className="danger" onClick={() => setStatus('canceled')} disabled={saving}>{t('cancelSub')}</button>
              </>
            ) : (
              <button onClick={() => setStatus('active')} disabled={saving}>{t('resumeSub')}</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
