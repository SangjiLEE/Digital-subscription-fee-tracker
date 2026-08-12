'use client';
import { useEffect, useState } from 'react';

/**
 * 마운트 후 true. 날짜·localStorage(언어/통화) 의존 콘텐츠를 마운트 뒤에만
 * 렌더링해 SSG hydration 불일치(React #418)와 설정 늦적용 깜빡임을 방지.
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
