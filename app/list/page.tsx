'use client';
import SubList from '@/components/SubList';
import { useLang } from '@/lib/i18n';
import { useMounted } from '@/lib/useMounted';

export default function ListPage() {
  const { t } = useLang();
  const mounted = useMounted();
  if (!mounted) return <main><div className="page-skel" aria-hidden="true"><i /><i /><i /></div></main>;
  return (
    <main>
      <SubList />
      <footer>{t('listFooter')}</footer>
    </main>
  );
}
