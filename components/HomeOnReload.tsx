'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** 새로고침으로 진입한 경우 항상 홈으로 이동 (앱처럼 홈에서 시작) */
export default function HomeOnReload() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    if (nav?.type === 'reload' && pathname !== '/') router.replace('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 최초 진입 시 1회만
  }, []);

  return null;
}
