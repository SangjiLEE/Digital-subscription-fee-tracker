'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import { useStore } from '@/lib/store';

const TABS = [
  { href: '/', icon: '▤', key: 'navHome' },
  { href: '/list', icon: '☰', key: 'navList' },
  { href: '/settings', icon: '⚙', key: 'navSettings' },
];

export default function TabNav() {
  const path = usePathname();
  const router = useRouter();
  const { setModalOpen, startScan } = useStore();
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    startScan(f);                 // 결과는 목록 화면 상단에 표시
    router.push('/list');
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      {path !== '/settings' && (
        <>
          {menuOpen && (
            <>
              <div className="fab-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="fab-menu" role="menu">
                <button role="menuitem"
                  onClick={() => { setMenuOpen(false); setModalOpen(true); }}>
                  {t('addManual')}
                </button>
                <button role="menuitem"
                  onClick={() => { setMenuOpen(false); fileRef.current?.click(); }}>
                  {t('addByPhoto')}
                </button>
                <span className="menu-note">{t('scanPrivacy')}</span>
              </div>
            </>
          )}
          <button className={`fab ${menuOpen ? 'open' : ''}`} aria-label={t('addTitle')}
            aria-expanded={menuOpen} onClick={() => setMenuOpen(v => !v)}>＋</button>
        </>
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
