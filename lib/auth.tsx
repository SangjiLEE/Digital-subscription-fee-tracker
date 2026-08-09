'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

interface User { uid: string; displayName: string; }
interface AuthCtx {
  user: User | null;
  loading: boolean;      // 초기 세션 복원 중 (팝업 깜빡임 방지용)
  signIn: () => void;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, signIn: () => {}, signOut: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u ? { uid: u.uid, displayName: u.displayName ?? '사용자' } : null);
      setLoading(false);
    });
  }, []);

  const signIn = () => {
    signInWithPopup(auth, googleProvider).catch(e => {
      // 팝업 차단 환경(모바일 브라우저 등) → 리다이렉트 방식으로 폴백
      if (e?.code === 'auth/popup-blocked') {
        signInWithRedirect(auth, googleProvider);
        return;
      }
      // 사용자가 팝업을 닫은 경우는 조용히 무시
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        console.error('로그인 실패:', e?.code);
        alert('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    });
  };
  const signOut = () => { fbSignOut(auth); };

  return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
