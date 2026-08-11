'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';
import { useLang } from './i18n';
import { refreshRates } from './fx';
import type { Currency } from './types';

/**
 * 구독 데이터 스토어.
 * - 비로그인: 데모 시드 데이터 (인메모리, 새로고침 시 초기화)
 * - 로그인: users/{uid}/subs·oneTime 실시간 구독 (Firestore)
 * UI 행 타입(SubRow)은 목업 유래의 축약형 — docs/schema.md의 전체
 * Subscription 스키마로의 마이그레이션은 카탈로그 연동 때 진행.
 */
export type Cat = 'ai' | 'dev' | 'ent' | 'sto' | 'etc';
export type Region = 'JP' | 'KR' | 'US';
export const CATNAME: Record<Cat, string> = {
  ai: 'AI·LLM', dev: '개발·인프라', ent: '영상·음악', sto: '클라우드·스토리지', etc: '기타',
};
export const CATCOLOR: Record<Cat, string> = {
  ai: 'var(--c-ai)', dev: 'var(--c-dev)', ent: 'var(--c-ent)', sto: 'var(--c-sto)', etc: '#B7C0CC',
};

export interface SubRow {
  id: string;
  name: string; plan: string; amt: number; c: Currency;
  cat: Cat; cycle: 'month' | 'year'; next: string; init: string;
  anchor?: string;               // 최초 결제일 'YYYY-MM-DD' (신규 등록분부터 저장)
  renew?: 'auto' | 'manual';
}
export interface OneTimeRow {
  id: string;
  name: string; note: string; amt: number; c: Currency; init: string;
  date?: string;                 // 결제일 'YYYY-MM-DD' (신규 등록분부터 저장)
}

const SEED_SUBS: SubRow[] = [
  { id: 'demo-1', name: 'Claude', plan: 'Pro', amt: 20, c: 'USD', cat: 'ai', cycle: 'month', next: '8/12', init: 'C', anchor: '2026-05-12' },
  { id: 'demo-2', name: 'ChatGPT', plan: 'Plus', amt: 3000, c: 'JPY', cat: 'ai', cycle: 'month', next: '8/18', init: 'G', anchor: '2026-05-18' },
  { id: 'demo-3', name: 'GitHub Copilot', plan: 'Pro', amt: 10, c: 'USD', cat: 'dev', cycle: 'month', next: '8/21', init: 'G', anchor: '2026-06-21' },
  { id: 'demo-4', name: 'Vercel', plan: 'Pro', amt: 20, c: 'USD', cat: 'dev', cycle: 'month', next: '8/25', init: 'V', anchor: '2026-05-25' },
  { id: 'demo-5', name: 'Netflix', plan: '스탠다드', amt: 1590, c: 'JPY', cat: 'ent', cycle: 'month', next: '8/15', init: 'N', anchor: '2026-05-15' },
  { id: 'demo-6', name: 'YouTube Premium', plan: '개인', amt: 1280, c: 'JPY', cat: 'ent', cycle: 'month', next: '8/20', init: 'Y', anchor: '2026-05-20' },
  { id: 'demo-7', name: 'Spotify', plan: 'Standard', amt: 1080, c: 'JPY', cat: 'ent', cycle: 'month', next: '8/23', init: 'S', anchor: '2026-07-23' },
  { id: 'demo-8', name: 'U-NEXT', plan: '월정액', amt: 2189, c: 'JPY', cat: 'ent', cycle: 'month', next: '8/28', init: 'U', anchor: '2026-07-28' },
  { id: 'demo-9', name: 'Google One', plan: 'Basic 100GB', amt: 290, c: 'JPY', cat: 'sto', cycle: 'month', next: '9/1', init: 'G', anchor: '2026-05-01' },
];
const SEED_ONETIME: OneTimeRow[] = [
  { id: 'demo-o1', name: 'Udemy 강의', note: '7/22 결제', amt: 1800, c: 'JPY', init: 'U', date: '2026-07-22' },
];

interface Store {
  cur: Currency; setCur: (c: Currency) => void;
  region: Region; setRegion: (r: Region) => void;      // 카탈로그 참고가 지역
  renewAlert: boolean; setRenewAlert: (v: boolean) => void; // 갱신 임박 앱 내 알림
  subs: SubRow[]; oneTime: OneTimeRow[];
  isDemo: boolean;                    // true = 비로그인 데모 데이터 표시 중
  fxDate: string | null;              // 환율 기준일 (null = 폴백 환율)
  addSub: (s: Omit<SubRow, 'id'>) => Promise<boolean>;
  updateSub: (id: string, patch: Partial<Omit<SubRow, 'id'>>) => Promise<boolean>;
  removeSub: (id: string) => Promise<boolean>;
  addOneTime: (o: Omit<OneTimeRow, 'id'>) => Promise<boolean>;
  removeOneTime: (id: string) => Promise<boolean>;
  modalOpen: boolean; setModalOpen: (v: boolean) => void;
  editing: SubRow | null; openEdit: (s: SubRow) => void;
  draft: Partial<Omit<SubRow, 'id'>> | null;      // 사진 인식 결과 프리필용
  openDraft: (d: Partial<Omit<SubRow, 'id'>>) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useLang();
  const fail = (e: { code?: string }) => {
    console.error('저장소 작업 실패:', e?.code);
    alert(t('opFail'));
  };
  const [cur, setCurState] = useState<Currency>('JPY');
  // 표시 통화: 기기에 저장 (홈 토글·설정 화면 공용)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('displayCur');
      if (saved === 'JPY' || saved === 'USD' || saved === 'KRW') setCurState(saved);
    } catch {}
  }, []);
  const setCur = (c: Currency) => {
    setCurState(c);
    try { localStorage.setItem('displayCur', c); } catch {}
  };
  const [region, setRegionState] = useState<Region>('JP');
  const [renewAlert, setRenewAlertState] = useState(true);
  useEffect(() => {
    try {
      const r = localStorage.getItem('priceRegion');
      if (r === 'JP' || r === 'KR' || r === 'US') setRegionState(r);
      const a = localStorage.getItem('renewAlert');
      if (a !== null) setRenewAlertState(a === '1');
    } catch {}
  }, []);
  const setRegion = (r: Region) => {
    setRegionState(r);
    try { localStorage.setItem('priceRegion', r); } catch {}
  };
  const setRenewAlert = (v: boolean) => {
    setRenewAlertState(v);
    try { localStorage.setItem('renewAlert', v ? '1' : '0'); } catch {}
  };
  const [subs, setSubs] = useState<SubRow[]>(SEED_SUBS);
  const [oneTime, setOneTime] = useState<OneTimeRow[]>(SEED_ONETIME);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SubRow | null>(null);
  const [draft, setDraft] = useState<Partial<Omit<SubRow, 'id'>> | null>(null);
  const [fxDate, setFxDate] = useState<string | null>(null);

  useEffect(() => { refreshRates().then(d => setFxDate(d)); }, []);

  useEffect(() => {
    if (!user) {
      // 데모 데이터는 최초 방문자 전용 — 로그인 이력이 있는 기기는 빈 상태
      let authedBefore = false;
      try { authedBefore = localStorage.getItem('hasAuthed') === '1'; } catch {}
      setSubs(authedBefore ? [] : SEED_SUBS);
      setOneTime(authedBefore ? [] : SEED_ONETIME);
      return;
    }
    try { localStorage.setItem('hasAuthed', '1'); } catch {}
    const subsQ = query(collection(db, 'users', user.uid, 'subs'), orderBy('createdAt'));
    const oneQ = query(collection(db, 'users', user.uid, 'oneTime'), orderBy('createdAt'));
    const unsub1 = onSnapshot(subsQ,
      snap => setSubs(snap.docs.map(d => ({ ...(d.data() as Omit<SubRow, 'id'>), id: d.id }))),
      e => console.error('subs 구독 실패:', e.code));
    const unsub2 = onSnapshot(oneQ,
      snap => setOneTime(snap.docs.map(d => ({ ...(d.data() as Omit<OneTimeRow, 'id'>), id: d.id }))),
      e => console.error('oneTime 구독 실패:', e.code));
    return () => { unsub1(); unsub2(); };
  }, [user]);

  // 각 작업은 완료 여부를 반환 — 호출부가 진행 표시(등록 중…)에 사용
  const addSub: Store['addSub'] = async s => {
    if (!user) { setSubs(p => [...p, { ...s, id: crypto.randomUUID() }]); return true; }
    try { await addDoc(collection(db, 'users', user.uid, 'subs'), { ...s, createdAt: serverTimestamp() }); return true; }
    catch (e) { fail(e as { code?: string }); return false; }
  };
  const updateSub: Store['updateSub'] = async (id, patch) => {
    if (!user) { setSubs(p => p.map(s => (s.id === id ? { ...s, ...patch } : s))); return true; }
    try { await updateDoc(doc(db, 'users', user.uid, 'subs', id), patch); return true; }
    catch (e) { fail(e as { code?: string }); return false; }
  };
  const removeSub: Store['removeSub'] = async id => {
    if (!user) { setSubs(p => p.filter(s => s.id !== id)); return true; }
    try { await deleteDoc(doc(db, 'users', user.uid, 'subs', id)); return true; }
    catch (e) { fail(e as { code?: string }); return false; }
  };
  const addOneTime: Store['addOneTime'] = async o => {
    if (!user) { setOneTime(p => [...p, { ...o, id: crypto.randomUUID() }]); return true; }
    try { await addDoc(collection(db, 'users', user.uid, 'oneTime'), { ...o, createdAt: serverTimestamp() }); return true; }
    catch (e) { fail(e as { code?: string }); return false; }
  };
  const removeOneTime: Store['removeOneTime'] = async id => {
    if (!user) { setOneTime(p => p.filter(o => o.id !== id)); return true; }
    try { await deleteDoc(doc(db, 'users', user.uid, 'oneTime', id)); return true; }
    catch (e) { fail(e as { code?: string }); return false; }
  };

  const openEdit = (s: SubRow) => { setDraft(null); setEditing(s); setModalOpen(true); };
  const openDraft: Store['openDraft'] = d => { setEditing(null); setDraft(d); setModalOpen(true); };
  const setModalOpenWrap = (v: boolean) => { setModalOpen(v); if (!v) { setEditing(null); setDraft(null); } };

  return (
    <Ctx.Provider value={{
      cur, setCur, region, setRegion, renewAlert, setRenewAlert,
      subs, oneTime, isDemo: !user, fxDate,
      addSub, updateSub, removeSub, addOneTime, removeOneTime,
      modalOpen, setModalOpen: setModalOpenWrap,
      editing, openEdit, draft, openDraft,
    }}>{children}</Ctx.Provider>
  );
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
}
