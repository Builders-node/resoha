import { cache } from 'react';
import { cookies } from 'next/headers';
import { CURRENCIES, CURRENCY_COOKIE, FALLBACK_RATES, isCurrency, makeMoney, type Currency } from './currency';

/** Безкоштовне джерело без ключа; оновлюється раз на добу. */
const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const DAY = 86_400;

// якщо джерело лежить, не чекаємо на нього в кожному запиті — пробуємо знову за 10 хвилин
let failedAt = 0;

/** Курси за 1 USD. Next кешує fetch на добу; при збої — запасні курси з lib/currency. */
export const getRates = cache(async (): Promise<Record<Currency, number>> => {
  if (Date.now() - failedAt < 600_000) return FALLBACK_RATES;
  try {
    const res = await fetch(RATES_URL, { next: { revalidate: DAY }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error(`rates ${res.status}`);
    const data = await res.json() as { result?: string; rates?: Record<string, number> };
    if (data.result !== 'success' || !data.rates) throw new Error('rates: bad payload');
    const out = { ...FALLBACK_RATES };
    for (const c of CURRENCIES) {
      const v = Number(data.rates[c]);
      if (v > 0) out[c] = v;
    }
    return out;
  } catch (e) {
    failedAt = Date.now();
    console.error('currency rates fetch failed, using fallback:', (e as Error).message);
    return FALLBACK_RATES;
  }
});

/** Валюта з кукі (як мова). */
export async function getCurrency(): Promise<Currency> {
  const v = (await cookies()).get(CURRENCY_COOKIE)?.value;
  return isCurrency(v) ? v : 'USD';
}

/** Курс обраної валюти; для доларів у джерело не ходимо. */
export async function getCurrencyRate(): Promise<{ cur: Currency; rate: number }> {
  const cur = await getCurrency();
  return { cur, rate: cur === 'USD' ? 1 : (await getRates())[cur] };
}

/** Форматери цін для серверних компонентів. */
export const getMoney = cache(async () => {
  const { cur, rate } = await getCurrencyRate();
  return makeMoney(cur, rate);
});
