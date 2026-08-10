'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { useStore } from '@/lib/store';

const TABS = [
  { href: '/', icon: '▤', key: 'navHome' },
  { href: '/list', icon: '☰', key: 'navList' },
  { href: '/settings', icon: '⚙', key: 'navSettings' },
];

export default function TabNav() {
  const path = usePathname();
  const { setModalOpen } = useStore();
  const { t } = useLang();
  return (
    <>
      {path !== '/settings' && (
        <button className="fab" aria-label={t('addTitle')} onClick={() => setModalOpen(true)}>＋</button>
      )}
      <nav>
        {TABS.map(tab => (
          <Link key={tab.href} href={tab.href} className={path === tab.href ? 'on' : ''}>
            <span className="ico">{tab.icon}</span>{t(tab.key)}
          </Link>
        ))}
      </nav>
    </>
  );
}
