import { PROPERTY_TAX_RATE } from './purchaseCosts';

/**
 * Дохідність здачі в оренду: подобова (Airbnb) або довга оренда.
 * Стартові цифри — з гайду roatan-rental-income (AirDNA: 43% завантаження, ≈ $209 за ніч,
 * керуюча компанія 20–30% виручки) і з lib/purchaseCosts (податок на нерухомість 0.25%).
 * Це приклад для власних розрахунків, а не прогноз для конкретного обʼєкта.
 */
export const RENTAL_GUIDE = '/guides/roatan-rental-income';

export type RentMode = 'nightly' | 'monthly';

export type YieldInputs = {
  mode: RentMode;
  price: number;
  /** за ніч, $ */
  nightly: number;
  /** завантаження, % ночей року */
  occupancy: number;
  /** довга оренда: $ на місяць і скільки місяців на рік здано */
  monthlyRent: number;
  monthsLet: number;
  /** частки виручки, % */
  management: number;
  platform: number;
  /** $ на місяць */
  hoa: number;
  upkeep: number;
  /** % ціни на рік */
  insurance: number;
  propertyTax: number;
  /** податок на дохід від оренди, % чистого доходу до податку */
  incomeTax: number;
};

/** Середні по Роатану з гайду; ціну й HOA бере з оголошення */
export const AIRDNA = { nightly: 209, occupancy: 43 };

export function defaultInputs(price: number, hoa: number, opts: { house?: boolean; mainland?: boolean } = {}): YieldInputs {
  return {
    // у містах на материку подобова оренда — рідкість, там стартуємо з довгої
    mode: opts.mainland ? 'monthly' : 'nightly',
    price,
    nightly: AIRDNA.nightly,
    occupancy: AIRDNA.occupancy,
    // приклад: 0.6% ціни на місяць, округлено до $50 — людина вписує свою ставку
    monthlyRent: Math.max(300, Math.round((price * 0.006) / 50) * 50),
    monthsLet: 11,
    management: 20,
    platform: 3,
    hoa: hoa > 0 ? hoa : 0,
    upkeep: opts.house ? 400 : 250,
    insurance: 0.4,
    propertyTax: PROPERTY_TAX_RATE * 100,
    incomeTax: 10,
  };
}

export type YieldResult = {
  gross: number;
  costs: { key: string; label: string; amount: number }[];
  beforeTax: number;
  tax: number;
  net: number;
  grossYield: number;
  netYield: number;
  /** років до окупності за чистим доходом; Infinity, коли доходу нема */
  payback: number;
  /** скільки ночей на рік, коли подобово */
  nights: number;
};

export function rentalYield(i: YieldInputs): YieldResult {
  const nights = i.mode === 'nightly' ? Math.round(365 * (clamp(i.occupancy, 0, 100) / 100)) : 0;
  const gross = i.mode === 'nightly' ? i.nightly * nights : i.monthlyRent * clamp(i.monthsLet, 0, 12);
  const costs = [
    { key: 'management', label: 'Property management', amount: gross * (i.management / 100) },
    // у довгій оренді платформи немає
    ...(i.mode === 'nightly' ? [{ key: 'platform', label: 'Booking platform fees', amount: gross * (i.platform / 100) }] : []),
    { key: 'hoa', label: 'HOA dues', amount: i.hoa * 12 },
    { key: 'upkeep', label: 'Utilities and maintenance', amount: i.upkeep * 12 },
    { key: 'insurance', label: 'Insurance', amount: i.price * (i.insurance / 100) },
    { key: 'propertyTax', label: 'Property tax', amount: i.price * (i.propertyTax / 100) },
  ].filter((c) => c.amount > 0);
  const beforeTax = gross - costs.reduce((s, c) => s + c.amount, 0);
  const tax = beforeTax > 0 ? beforeTax * (i.incomeTax / 100) : 0;
  const net = beforeTax - tax;
  return {
    gross, costs, beforeTax, tax, net, nights,
    grossYield: i.price > 0 ? gross / i.price : 0,
    netYield: i.price > 0 ? net / i.price : 0,
    payback: net > 0 ? i.price / net : Infinity,
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : 0));
