import type { Deal } from './types';
import { translate, type Lang } from './i18n';

/**
 * Валюта показу. Ціни в базі завжди в доларах; тут лише перерахунок для показу
 * за денним курсом (lib/currencyServer.ts). Перераховане позначаємо «≈».
 */
export type Currency = 'USD' | 'HNL' | 'CAD' | 'EUR';
export const CURRENCIES: Currency[] = ['USD', 'HNL', 'CAD', 'EUR'];
export const CURRENCY_COOKIE = 'currency';
export const isCurrency = (v: unknown): v is Currency => CURRENCIES.includes(v as Currency);

/** Запасні курси за 1 USD — на випадок, коли джерело курсів недоступне. */
export const FALLBACK_RATES: Record<Currency, number> = { USD: 1, HNL: 26.2, CAD: 1.38, EUR: 0.92 };

export const CURRENCY_NAMES: Record<Currency, string> = {
  USD: 'US dollar', HNL: 'Honduran lempira', CAD: 'Canadian dollar', EUR: 'Euro',
};

const SQFT_PER_M2 = 10.7639;

const fmt = (cur: Currency) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: cur, maximumFractionDigits: 0,
  // L 1,234 замість «HNL 1,234»; CA$ лишаємо, щоб не плутати з доларом США
  currencyDisplay: cur === 'HNL' ? 'narrowSymbol' : 'symbol',
});
const FMT = Object.fromEntries(CURRENCIES.map((c) => [c, fmt(c)])) as Record<Currency, Intl.NumberFormat>;
const SYMBOL: Record<Currency, string> = { USD: '$', HNL: 'L ', CAD: 'CA$', EUR: '€' };

export type Money = {
  cur: Currency;
  /** скільки одиниць валюти за 1 USD */
  rate: number;
  /** true — показуємо не долари, отже сума приблизна */
  converted: boolean;
  symbol: string;
  fromUsd: (usd: number) => number;
  toUsd: (v: number) => number;
  /** «$1,234» або «≈ €1,136» */
  amount: (usd: number) => string;
  /** те саме без «≈» — для другої половини діапазону */
  bare: (usd: number) => string;
  /** «≈ €1,136–€1,560» */
  range: (lo: number, hi: number) => string;
  /** ціна з «/mo» для оренди */
  price: (usd: number, deal: Deal, lang?: Lang) => string;
  /** компактно для пінів: $1.45M, ≈ €649K */
  short: (usd: number, deal?: Deal, lang?: Lang) => string;
  /** «$1,596/m² · $148/ft²» */
  perArea: (usd: number, sqft: number, sep?: string) => string;
};

export function makeMoney(cur: Currency = 'USD', rate = 1): Money {
  const r = cur === 'USD' || !(rate > 0) ? 1 : rate;
  const converted = cur !== 'USD';
  const pre = converted ? '≈ ' : '';
  const fromUsd = (usd: number) => usd * r;
  const bare = (usd: number) => FMT[cur].format(Math.round(fromUsd(usd)));
  const amount = (usd: number) => pre + bare(usd);
  const compact = (usd: number) => {
    const v = fromUsd(usd);
    const s = SYMBOL[cur];
    // у лемпірах суми на порядок більші: «L 38M», а не «L 37.99M»
    if (v >= 1_000_000) return `${s}${(v / 1_000_000).toFixed(v >= 100_000_000 ? 0 : v >= 10_000_000 ? 1 : 2).replace(/\.0+$|(\.\d*?)0+$/, '$1')}M`;
    return v >= 1_000 ? `${s}${Math.round(v / 1_000)}K` : `${s}${Math.round(v)}`;
  };
  return {
    cur, rate: r, converted, symbol: SYMBOL[cur],
    fromUsd,
    toUsd: (v: number) => v / r,
    amount,
    bare,
    range: (lo, hi) => `${amount(lo)}–${bare(hi)}`,
    price: (usd, deal, lang = 'en') => (deal === 'rent' ? `${amount(usd)}${translate(lang, '/mo')}` : amount(usd)),
    short: (usd, deal = 'sale', lang = 'en') =>
      deal === 'rent' ? `${amount(usd)}${translate(lang, '/mo')}` : `${converted ? '≈' : ''}${compact(usd)}`,
    perArea: (usd, sqft, sep = ' · ') =>
      `${amount(Math.round((usd / sqft) * SQFT_PER_M2))}/m²${sep}${bare(Math.round(usd / sqft))}/ft²`,
  };
}

/** Доларова «Money» для місць, що лишаються в USD (PDF, кабінети, повідомлення агенту). */
export const USD_MONEY = makeMoney('USD', 1);
