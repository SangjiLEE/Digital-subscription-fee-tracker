'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';

export default function Header() {
  const { user, authBusy, signIn, signOut } = useAuth();
  const { t } = useLang();
  return (
    <header>
      <Link href="/" className="wordmark" aria-label={t('navHome')}>Digital Sub Fee Tracker<small>ALPHA</small></Link>
      {user ? (
        <button className="login-btn ghost" onClick={signOut}>{user.displayName} · {t('signOut')}</button>
      ) : (
        <button className="login-btn" onClick={signIn} disabled={authBusy}>
          {authBusy ? t('signingIn') : t('signIn')}
        </button>
      )}
    </header>
  );
}
