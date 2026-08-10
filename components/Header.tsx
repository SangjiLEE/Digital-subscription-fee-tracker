'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function Header() {
  const { user, signIn, signOut } = useAuth();
  return (
    <header>
      <Link href="/" className="wordmark" aria-label="홈으로">Digital Sub Fee Tracker<small>ALPHA</small></Link>
      {user ? (
        <button className="login-btn ghost" onClick={signOut}>{user.displayName} · 로그아웃</button>
      ) : (
        <button className="login-btn" onClick={signIn}>로그인</button>
      )}
    </header>
  );
}
