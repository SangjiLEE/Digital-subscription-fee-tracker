'use client';
import { useStore } from '@/lib/store';
import type { Currency } from '@/lib/types';

const CURS: Currency[] = ['KRW', 'JPY', 'USD'];
const LABEL: Record<Currency, string> = { KRW: '₩', JPY: '¥', USD: '$' };

export default function CurrencyToggle() {
  const { cur, setCur } = useStore();
  return (
    <div className="cur-toggle" role="group" aria-label="표시 통화">
      {CURS.map(c => (
        <button key={c} aria-pressed={cur === c} onClick={() => setCur(c)}>{LABEL[c]}</button>
      ))}
    </div>
  );
}
