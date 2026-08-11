'use client';
import SubList from '@/components/SubList';
import { useLang } from '@/lib/i18n';

export default function ListPage() {
  const { t } = useLang();
  return (
    <main>
      <SubList />
      <footer>{t('listFooter')}</footer>
    </main>
  );
}
