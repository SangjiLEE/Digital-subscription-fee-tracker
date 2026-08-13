'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider, onAuthStateChanged, signInWithCredential,
  signInWithPopup, signInWithRedirect, signOut as fbSignOut,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

const GSI_SRC = 'https://accounts.google.com/gsi/client';
// OAuth 웹 클라이언트 ID — 공개 식별자 (로그인 URL에 그대로 노출되는 값)
const GSI_CLIENT_ID = '974181000422-pam8ljdofu253e3kgsv3fvpe3rs3bkhv.apps.googleusercontent.com';

declare global { interface Window { google?: any } }

interface User { uid: string; displayName: string; }
interface AuthCtx {
  user: User | null;
  loading: boolean;      // 초기 세션 복원 중 (팝업 깜빡임 방지용)
  authBusy: boolean;     // 로그인 진행 중 (버튼 표시·중복 클릭 방지)
  signIn: () => void;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, authBusy: false, signIn: () => {}, signOut: () => {} });

function reportFail(e: { code?: string } | undefined) {
  console.error('로그인 실패:', e?.code);
  alert(`로그인에 실패했습니다. 잠시 후 다시 시도해주세요.\n(오류 코드: ${e?.code ?? '알 수 없음'})`);
}

/** 팝업 방식 (차단 시 리다이렉트 폴백). onSettle: 진행 상태 해제용 */
function popupSignInWith(onSettle: () => void) {
  signInWithPopup(auth, googleProvider).catch(e => {
    if (e?.code === 'auth/popup-blocked') {
      signInWithRedirect(auth, googleProvider);
      return;
    }
    onSettle();
    if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
      reportFail(e);
    }
  });
}

/** GIS 스크립트 로드 보장 후 콜백 */
function withGsi(cb: () => void, onError: () => void) {
  if (window.google?.accounts?.id) { cb(); return; }
  let s = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
  if (!s) {
    s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    document.head.appendChild(s);
  }
  s.addEventListener('load', cb, { once: true });
  s.addEventListener('error', onError, { once: true });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const userRef = useRef<User | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);

  // 로그인 완료(user 도착) 시 진행 상태 해제
  useEffect(() => { if (user) setAuthBusy(false); }, [user]);

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u ? { uid: u.uid, displayName: u.displayName ?? '사용자' } : null);
      setLoading(false);
    });
  }, []);

  /**
   * 1순위: Google One Tap (FedCM) — 브라우저 내장 UI라 팝업 차단기/확장의
   * 영향을 받지 않는다. 표시 불가(쿨다운·미로그인 등)면 팝업 방식 폴백.
   */
  const popupSignIn = () => popupSignInWith(() => setAuthBusy(false));

  const signIn = () => {
    if (authBusy) return;                      // 중복 클릭 방지
    setAuthBusy(true);
    setTimeout(() => setAuthBusy(false), 15_000);  // 안전 타임아웃
    withGsi(() => {
      const gid = window.google.accounts.id;
      gid.initialize({
        client_id: GSI_CLIENT_ID,
        use_fedcm_for_prompt: true,
        callback: (resp: { credential: string }) => {
          signInWithCredential(auth, GoogleAuthProvider.credential(resp.credential))
            .catch(e => { setAuthBusy(false); reportFail(e); });
        },
      });
      // FedCM에서는 moment 상태 메서드가 동작하지 않을 수 있음(GSI 경고)
      // → 콜백이 오면 활용하되, 일정 시간 내 아무 신호가 없으면 팝업으로 전환
      let momentFired = false;
      let fellBack = false;
      const fallbackToPopup = () => {
        if (fellBack || userRef.current) return;
        fellBack = true;
        try { gid.cancel?.(); } catch { /* One Tap 미표시 시 무해 */ }
        popupSignIn();
      };
      gid.prompt((moment: any) => {
        momentFired = true;
        const skipped = moment?.isSkippedMoment?.() || moment?.isNotDisplayed?.();
        const dismissed = moment?.isDismissedMoment?.();
        if (skipped) fallbackToPopup();
        else if (dismissed) setAuthBusy(false);
      });
      setTimeout(() => { if (!momentFired) fallbackToPopup(); }, 2500);
    }, popupSignIn);
  };


  const signOut = () => {
    window.google?.accounts?.id?.disableAutoSelect?.();
    fbSignOut(auth);
  };

  return <Ctx.Provider value={{ user, loading, authBusy, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
