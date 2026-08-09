'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';
import type { Currency } from './types';

/**
 * 구독 데이터 스토어.
 * - 비로그인: 데모 시드 데이터 (인메모리, 새로고침 시 초기화)
 * - 로그인: users/{uid}/subs·oneTime 실시간 구독 (Firestore)
 * UI 행 타입(SubRow)은 목업 유래의 축약형 — docs/schema.md의 전체
 * Subscription 스키마로의 마이그레이션은 카탈로그 연동 때 진행.
 */
export type Cat = 'ai' | 'dev' | 'ent' | 'sto' | 'etc';
export const CATNAME: Record<Cat, string> = {
  ai: 'AI·LLM', dev: '개발·인프라', ent: '영상·음악', sto: '클라우드·스토리지', etc: '기타',
};
export const CATCOLOR: Record<Cat, string> = {
  ai: 'var(--c-ai)', dev: 'var(--c-dev)', ent: 'var(--c-ent)', sto: 'var(--c-sto)', etc: '#B7C0CC',
};

export interface SubRow {
  name: string; plan: string; amt: number; c: Currency;
  cat: Cat; cycle: 'month' | 'year'; next: string; init: string;
}
export interface OneTimeRow {
  name: string; note: string; amt: number; c: Currency; init: string;
}

const SEED_SUBS: SubRow[] = [
  { name: 'Claude', plan: 'Pro', amt: 20, c: 'USD', cat: 'ai', cycle: 'month', next: '8/12', init: 'C' },
  { name: 'ChatGPT', plan: 'Plus', amt: 3000, c: 'JPY', cat: 'ai', cycle: 'month', next: '8/18', init: 'G' },
  { name: 'GitHub Copilot', plan: 'Pro', amt: 10, c: 'USD', cat: 'dev', cycle: 'month', next: '8/21', init: 'G' },
  { name: 'Vercel', plan: 'Pro', amt: 20, c: 'USD', cat: 'dev', cycle: 'month', next: '8/25', init: 'V' },
  { name: 'Netflix', plan: '스탠다드', amt: 1590, c: 'JPY', cat: 'ent', cycle: 'month', next: '8/15', init: 'N' },
  { name: 'YouTube Premium', plan: '개인', amt: 1280, c: 'JPY', cat: 'ent', cycle: 'month', next: '8/20', init: 'Y' },
  { name: 'Spotify', plan: 'Standard', amt: 1080, c: 'JPY', cat: 'ent', cycle: 'month', next: '8/23', init: 'S' },
  { name: 'U-NEXT', plan: '월정액', amt: 2189, c: 'JPY', cat: 'ent', cycle: 'month', next: '8/28', init: 'U' },
  { name: 'Google One', plan: 'Basic 100GB', amt: 290, c: 'JPY', cat: 'sto', cycle: 'month', next: '9/1', init: 'G' },
];
const SEED_ONETIME: OneTimeRow[] = [
  { name: 'Udemy 강의', note: '7/22 결제', amt: 1800, c: 'JPY', init: 'U' },
];

interface Store {
  cur: Currency; setCur: (c: Currency) => void;
  subs: SubRow[]; oneTime: OneTimeRow[];
  isDemo: boolean;                    // true = 비로그인 데모 데이터 표시 중
  addSub: (s: SubRow) => void;
  addOneTime: (o: OneTimeRow) => void;
  modalOpen: boolean; setModalOpen: (v: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cur, setCur] = useState<Currency>('JPY');
  const [subs, setSubs] = useState<SubRow[]>(SEED_SUBS);
  const [oneTime, setOneTime] = useState<OneTimeRow[]>(SEED_ONETIME);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setSubs(SEED_SUBS);
      setOneTime(SEED_ONETIME);
      return;
    }
    const subsQ = query(collection(db, 'users', user.uid, 'subs'), orderBy('createdAt'));
    const oneQ = query(collection(db, 'users', user.uid, 'oneTime'), orderBy('createdAt'));
    const unsub1 = onSnapshot(subsQ,
      snap => setSubs(snap.docs.map(d => d.data() as SubRow)),
      e => console.error('subs 구독 실패:', e.code));
    const unsub2 = onSnapshot(oneQ,
      snap => setOneTime(snap.docs.map(d => d.data() as OneTimeRow)),
      e => console.error('oneTime 구독 실패:', e.code));
    return () => { unsub1(); unsub2(); };
  }, [user]);

  const addSub = (s: SubRow) => {
    if (user) {
      addDoc(collection(db, 'users', user.uid, 'subs'), { ...s, createdAt: serverTimestamp() })
        .catch(e => { console.error('저장 실패:', e.code); alert('저장에 실패했습니다.'); });
    } else {
      setSubs(p => [...p, s]);
    }
  };
  const addOneTime = (o: OneTimeRow) => {
    if (user) {
      addDoc(collection(db, 'users', user.uid, 'oneTime'), { ...o, createdAt: serverTimestamp() })
        .catch(e => { console.error('저장 실패:', e.code); alert('저장에 실패했습니다.'); });
    } else {
      setOneTime(p => [...p, o]);
    }
  };

  return (
    <Ctx.Provider value={{
      cur, setCur, subs, oneTime, isDemo: !user,
      addSub, addOneTime,
      modalOpen, setModalOpen,
    }}>{children}</Ctx.Provider>
  );
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
}
