'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * 인증 스텁. Firebase 연동 TODO:
 *  1. `npm i firebase`
 *  2. lib/firebase.ts에 initializeApp(환경변수 NEXT_PUBLIC_FIREBASE_*)
 *  3. signInWithPopup(GoogleAuthProvider) — Multifolios와 동일 패턴
 *  4. onAuthStateChanged로 user 상태 동기화
 * 지금은 로그인 버튼이 mock 유저를 토글한다 (웰컴 팝업 조건 테스트용).
 */
interface User { uid: string; displayName: string; }
interface AuthCtx {
  user: User | null;
  signIn: () => void;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, signIn: () => {}, signOut: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const signIn = () => setUser({ uid: 'mock-uid', displayName: '상지' }); // TODO: Google OAuth
  const signOut = () => setUser(null);
  return <Ctx.Provider value={{ user, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
