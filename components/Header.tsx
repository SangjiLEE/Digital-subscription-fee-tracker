'use client';
import { useAuth } from '@/lib/auth';

export default function Header() {
  const { user, signIn, signOut } = useAuth();
  return (
    <header>
      <div className="wordmark">Subfolio<small>ALPHA</small></div>
      {user ? (
        <button className="login-btn ghost" onClick={signOut}>{user.displayName} · 로그아웃</button>
      ) : (
        <button className="login-btn" onClick={signIn}>로그인</button>
      )}
    </header>
  );
}
