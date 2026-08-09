'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';

const TABS = [
  { href: '/', icon: '▤', label: '홈' },
  { href: '/list', icon: '☰', label: '목록' },
  { href: '/settings', icon: '⚙', label: '설정' },
];

export default function TabNav() {
  const path = usePathname();
  const { setModalOpen } = useStore();
  return (
    <>
      {path !== '/settings' && (
        <button className="fab" aria-label="구독 등록" onClick={() => setModalOpen(true)}>＋</button>
      )}
      <nav>
        {TABS.map(t => (
          <Link key={t.href} href={t.href} className={path === t.href ? 'on' : ''}>
            <span className="ico">{t.icon}</span>{t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
