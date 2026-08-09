'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Currency } from './types';

/**
 * 목업 상태를 담는 인메모리 스토어.
 * Firestore 연동 시 subs/oneTime는 users/{uid}/subscriptions 구독으로 교체.
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
  addSub: (s: SubRow) => void;
  addOneTime: (o: OneTimeRow) => void;
  modalOpen: boolean; setModalOpen: (v: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cur, setCur] = useState<Currency>('JPY');
  const [subs, setSubs] = useState<SubRow[]>(SEED_SUBS);
  const [oneTime, setOneTime] = useState<OneTimeRow[]>(SEED_ONETIME);
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <Ctx.Provider value={{
      cur, setCur, subs, oneTime,
      addSub: s => setSubs(p => [...p, s]),
      addOneTime: o => setOneTime(p => [...p, o]),
      modalOpen, setModalOpen,
    }}>{children}</Ctx.Provider>
  );
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
}
