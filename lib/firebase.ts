import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
  getAuth, initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 웹 클라이언트 설정값 — 비밀이 아니라 식별자이며 번들에 포함되는 게 정상.
// 접근 제어는 Firestore 보안 규칙 + Auth 승인 도메인이 담당한다.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// App Check (reCAPTCHA v3) — 사이트 키가 설정된 경우에만 활성화.
// 키 없이도 앱은 정상 동작 (AI Logic은 모니터링 모드 유지 필요).
const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
if (typeof window !== 'undefined' && recaptchaKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn('App Check 초기화 실패:', e);
  }
}
// 인증 영속화는 localStorage 사용 — IndexedDB는 크롬에서 간헐적으로
// 연결이 닫혀("Database is closing/hidden") 로그인 결과 저장이 실패함.
// 브라우저 전용 영속화라 SSG 프리렌더(서버)에서는 getAuth로 대체.
export const auth = typeof window !== 'undefined'
  ? initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  : getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
