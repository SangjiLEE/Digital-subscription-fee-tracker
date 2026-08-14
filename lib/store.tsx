'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';
import { useLang } from './i18n';
import { refreshRates } from './fx';
import { scanImage, type ScanItem } from './scan';
import type { Currency } from './types';

/**
 * 구독 데이터 스토어.
 * - 비로그인: 데모 시드 데이터 (인메모리, 새로고침 시 초기화)
 * - 로그인: users/{uid}/subs·oneTime 실시간 구독 (Firestore)
 * UI 행 타입(SubRow)은 목업 유래의 축약형 — docs/schema.md의 전체
 * Subscription 스키마로의 마이그레이션은 카탈로그 연동 때 진행.
 */
export type Cat = 'ai' | 'dev' | 'ent' | 'sto' | 'prod' | 'game' | 'ins' | 'etc';
export type Region = 'JP' | 'KR' | 'US';
export const CATNAME: Record<Cat, string> = {
  ai: 'AI·LLM', dev: '개발·인프라', ent: '영상·음악', sto: '클라우드·스토리지',
  prod: '생산성·문서', game: '게임', ins: '보험·케어', etc: '기타',
};
/** 목록 그룹 점 색 (라벨이 항상 병기되므로 색 단독 식별 아님).
 *  차트는 검증된 4색+기타만 사용 — prod/game/ins는 차트에서 '기타'로 합산 */
export const CATCOLOR: Record<Cat, string> = {
  ai: 'var(--c-ai)', dev: 'var(--c-dev)', ent: 'var(--c-ent)', sto: 'var(--c-sto)',
  prod: '#C2589E', game: '#6B7F2A', ins: '#AD5A48', etc: '#B7C0CC',
};
export const CAT_ORDER: Cat[] = ['ai', 'dev', 'ent', 'sto', 'prod', 'game', 'ins', 'etc'];
export const CAT_KEY: Record<Cat, string> = {
  ai: 'catAi', dev: 'catDev', ent: 'catEnt', sto: 'catSto',
  prod: 'catProd', game: 'catGame', ins: 'catIns', etc: 'catEtc',
};

export type SubStatus = 'active' | 'paused' | 'canceled';
export interface SubRow {
  id: string;
  name: string; plan: string; amt: number; c: Currency;
  cat: Cat; cycle: 'month' | 'year'; next: string; init: string;
  anchor?: string;               // 최초 결제일 'YYYY-MM-DD' (신규 등록분부터 저장)
  renew?: 'auto' | 'manual';
  status?: SubStatus;            // 미지정 = active (기존 데이터 호환)
  endDate?: string;              // 해지·일시정지 시작일 'YYYY-MM-DD' — 이후 청구 없음
}
/** 청구가 계속되는 구독인가 (status 미지정 = active) */
export const isActive = (s: Pick<SubRow, 'status'>) => !s.status || s.status === 'active';
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
  // 사진 인식 (어느 화면에서든 시작 → 목록 화면에서 결과 표시)
  scanBusy: boolean;
  scanItems: ScanItem[];
  scanNotice: string | null;
  startScan: (file: File) => Promise<void>;
  retryScan: () => void;
  cancelScan: () => void;
  dropScanItem: (it: ScanItem) => void;
  // 토스트 (성공/에러 + 선택적 undo) 와 인앱 확인 다이얼로그 — confirm()/alert() 대체
  toast: ToastState | null;
  showToast: (msg: string, opts?: { kind?: 'ok' | 'err'; undo?: () => void }) => void;
  dismissToast: () => void;
  confirmReq: ConfirmReq | null;
  askConfirm: (msg: string, okLabel: string, danger?: boolean) => Promise<boolean>;
  answerConfirm: (ok: boolean) => void;
}

export interface ToastState { msg: string; kind: 'ok' | 'err'; undo?: () => void }
export interface ConfirmReq { msg: string; okLabel: string; danger: boolean }

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useLang();

  // 토스트: undo 있는 삭제 알림은 5초, 일반 알림은 2.6초 후 자동 소멸
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastSeq = useRef(0);
  const showToast: Store['showToast'] = (msg, opts) => {
    const seq = ++toastSeq.current;
    setToast({ msg, kind: opts?.kind ?? 'ok', undo: opts?.undo });
    setTimeout(() => { if (seq === toastSeq.current) setToast(null); }, opts?.undo ? 5000 : 2600);
  };
  const dismissToast = () => { toastSeq.current++; setToast(null); };

  // 확인 다이얼로그: askConfirm → Feedback 컴포넌트가 렌더 → answerConfirm으로 resolve
  const [confirmReq, setConfirmReq] = useState<ConfirmReq | null>(null);
  const confirmResolve = useRef<((v: boolean) => void) | null>(null);
  const askConfirm: Store['askConfirm'] = (msg, okLabel, danger = false) => {
    confirmResolve.current?.(false);           // 중첩 호출 시 이전 요청은 취소 처리
    return new Promise<boolean>(resolve => {
      confirmResolve.current = resolve;
      setConfirmReq({ msg, okLabel, danger });
    });
  };
  const answerConfirm = (ok: boolean) => {
    setConfirmReq(null);
    confirmResolve.current?.(ok);
    confirmResolve.current = null;
  };

  const fail = (e: { code?: string }) => {
    console.error('저장소 작업 실패:', e?.code);
    showToast(t('opFail'), { kind: 'err' });
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

  const [scanBusy, setScanBusy] = useState(false);
  const [scanItems, setScanItems] = useState<ScanItem[]>([]);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const lastScanFile = useRef<File | null>(null);
  const scanSeq = useRef(0);            // 취소·재시도 시 이전 요청 결과 무시용
  const startScan = async (file: File) => {
    lastScanFile.current = file;
    const seq = ++scanSeq.current;
    setScanBusy(true); setScanNotice(null); setScanItems([]);
    try {
      const r = await scanImage(file);
      if (seq !== scanSeq.current) return;   // 취소됨/새 요청으로 대체됨
      setScanItems(r);
      if (!r.length) setScanNotice(t('scanNotFound'));
    } catch (err) {
      if (seq !== scanSeq.current) return;
      console.error('스캔 실패:', err);
      const msg = (err as Error)?.message ?? '?';
      setScanNotice(msg === 'SCAN_TIMEOUT'
        ? t('scanTimeout')
        : t('scanFailed', { d: msg.slice(0, 140) }));
    } finally {
      if (seq === scanSeq.current) setScanBusy(false);
    }
  };
  const retryScan = () => { if (lastScanFile.current) startScan(lastScanFile.current); };
  const cancelScan = () => {
    scanSeq.current++;
    setScanBusy(false); setScanNotice(null); setScanItems([]);
  };
  const dropScanItem = (it: ScanItem) => setScanItems(p => p.filter(x => x !== it));

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
      scanBusy, scanItems, scanNotice, startScan, retryScan, cancelScan, dropScanItem,
      toast, showToast, dismissToast, confirmReq, askConfirm, answerConfirm,
    }}>{children}</Ctx.Provider>
  );
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('StoreProvider missing');
  return v;
}
