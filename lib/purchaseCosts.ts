/**
 * Скільки коштує купівля поверх ціни. Цифри — ті самі, що в гайді roatan-closing-costs
 * (lib/content/guides.ts, джерела в lib/content/sources.ts); міняються — міняємо разом.
 */
export const CLOSING_GUIDE = '/guides/roatan-closing-costs';

export type CostItem = {
  key: 'transfer' | 'legal' | 'registration';
  label: string;
  /** частка ціни за замовчуванням і межі з гайду */
  rate: number;
  min: number;
  max: number;
  /** як гайд описує межі — показуємо поруч, щоб було видно, звідки число */
  hint: string;
};

export const COST_ITEMS: CostItem[] = [
  { key: 'transfer', label: 'Transfer tax', rate: 0.015, min: 0.015, max: 0.015, hint: '1.5% of the price' },
  // гайд: 1–3%; беремо середину, людина може посунути
  { key: 'legal', label: 'Attorney and notary fees', rate: 0.02, min: 0.01, max: 0.03, hint: '1–3% of the price' },
  // гайд: $1,000–3,000 на будинку за $300,000 — тобто ≈0.33–1%; середина ≈0.67%
  { key: 'registration', label: 'Registration, survey, escrow', rate: 2000 / 300000, min: 1000 / 300000, max: 0.01, hint: '$1,000–3,000 on a $300,000 home' },
];

/** «Більшість простих угод — 4–5.5%»: цей діапазон показує й паспорт ділянки */
export const TYPICAL_CLOSING = { low: 0.04, high: 0.055 };

/** Податок на нерухомість: 0.25% кадастрової вартості на рік; вона зазвичай нижча за ціну — тож це верхня межа */
export const PROPERTY_TAX_RATE = 0.0025;

/** Ануїтетний платіж: сума кредиту, річна ставка у відсотках, строк у роках. */
export function monthlyPayment(principal: number, ratePct: number, years: number) {
  const n = Math.round(years * 12);
  if (principal <= 0 || n <= 0) return 0;
  const r = ratePct / 100 / 12;
  return r > 0 ? (principal * r) / (1 - (1 + r) ** -n) : principal / n;
}

export type Terms = { down: number; rate: number; years: number };

/**
 * Стартові умови. Іпотеку іноземцю на острові дають рідко (гайд how-to-buy-property-in-roatan),
 * тож це приклад, а не пропозиція банку; продавець із owner financing ставить свої умови.
 */
export const DEFAULT_TERMS: Terms = { down: 30, rate: 8, years: 15 };
export const OWNER_TERMS: Terms = { down: 30, rate: 8, years: 10 };
export const CASH_TERMS: Terms = { down: 100, rate: 0, years: 0 };
