'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { CURRENCIES, CURRENCY_COOKIE, CURRENCY_NAMES, isCurrency, type Currency } from '@/lib/currency';
import { useMoney } from './CurrencyProvider';
import { useT } from './LangProvider';

const LABELS: Record<Currency, string> = { USD: 'USD $', HNL: 'HNL L', CAD: 'CAD $', EUR: 'EUR €' };

const saveCurrency = (c: Currency) => {
  document.cookie = `${CURRENCY_COOKIE}=${c}; path=/; max-age=31536000; samesite=lax`;
};

/** Перемикач валюти поруч із мовою: вибір у кукі на рік, сторінка перерендерюється на сервері. */
export default function CurrencySwitch({ className = '' }: { className?: string }) {
  const { cur } = useMoney();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();

  function pick(next: string) {
    if (!isCurrency(next) || next === cur) return;
    saveCurrency(next);
    start(() => router.refresh());
  }

  return (
    <label className={`curswitch ${className}`} aria-busy={pending} title={t('Prices are stored in US dollars; other currencies are converted at the daily rate.')}>
      <span className="sr-only">{t('Currency')}</span>
      <select value={cur} onChange={(e) => pick(e.target.value)} aria-label={t('Currency')}>
        {CURRENCIES.map((c) => <option key={c} value={c} title={t(CURRENCY_NAMES[c])}>{LABELS[c]}</option>)}
      </select>
    </label>
  );
}
