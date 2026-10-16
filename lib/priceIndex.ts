import { SQFT_PER_M2 } from './format';
import { REGIONS } from './regions';
import type { StatRow } from './types';

/**
 * «Індекс Hogarli»: щомісячна сторінка з цінами для журналістів і AI-пошуку.
 * Рахуємо з тих самих відкритих оголошень, що й статистика в каталозі (lib/priceStats):
 * медіана ціни продажу за m², медіана оренди, валова дохідність оренди і райони.
 * Зміна за рік — з історії listing_prices; поки історії мало, відсоток не показуємо.
 */

/** Менше оголошень у групі — медіана нічого не каже, групу не показуємо */
const MIN_N = 3;

export type IndexValue = { value: number; change: number | null; count: number };

export type BedsRow = {
  /** 0 — студія, 1, 2, 3 (= 3+) */
  beds: number;
  sale: IndexValue | null;
  rent: IndexValue | null;
  /** валова дохідність: річна оренда / ціна продажу, у відсотках */
  yieldPct: number | null;
};

export type AreaRow = { name: string; perM2: IndexValue };

export type CityIndex = {
  slug: string;
  name: string;
  perM2: IndexValue | null;
  saleMedian: IndexValue | null;
  rentMedian: IndexValue | null;
  beds: BedsRow[];
  /** райони за ціною за m², найдорожчі першими */
  areas: AreaRow[];
  saleCount: number;
  rentCount: number;
};

export type PriceIndex = {
  /** перший день місяця випуску, ISO */
  month: string;
  cities: CityIndex[];
  /** райони з найбільшим зростанням ціни за m² за рік (усі міста) */
  rising: (AreaRow & { city: string })[];
  total: number;
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function value(rows: StatRow[], f: (price: number, r: StatRow) => number): IndexValue | null {
  if (rows.length < MIN_N) return null;
  const now = median(rows.map((r) => f(r.price, r)));
  const old = rows.filter((r) => r.priceThen !== null).map((r) => f(r.priceThen!, r));
  const then = old.length >= MIN_N ? median(old) : 0;
  return {
    value: Math.round(now),
    change: then > 0 ? Math.round(((now - then) / then) * 1000) / 10 : null,
    count: rows.length,
  };
}

const perM2 = (price: number, r: StatRow) => (price / r.sqft) * SQFT_PER_M2;
const bedsOf = (r: StatRow) => Math.min(3, Math.max(0, r.beds));

export function buildPriceIndex(rows: StatRow[], now = new Date()): PriceIndex {
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const homes = rows.filter((r) => (r.type === 'condo' || r.type === 'house') && r.price > 0);

  const cities: CityIndex[] = REGIONS.map((reg) => {
    const own = homes.filter((r) => r.island === reg.name);
    const sale = own.filter((r) => r.deal === 'sale');
    const rent = own.filter((r) => r.deal === 'rent');
    const sized = sale.filter((r) => r.sqft > 0);

    const beds: BedsRow[] = [0, 1, 2, 3].map((b) => {
      const s = value(sale.filter((r) => bedsOf(r) === b), (p) => p);
      const rn = value(rent.filter((r) => bedsOf(r) === b), (p) => p);
      return { beds: b, sale: s, rent: rn, yieldPct: s && rn ? Math.round(((rn.value * 12) / s.value) * 1000) / 10 : null };
    });

    const byArea = new Map<string, StatRow[]>();
    sized.forEach((r) => byArea.set(r.neighborhood, [...(byArea.get(r.neighborhood) ?? []), r]));
    const areas = [...byArea.entries()]
      .map(([name, list]) => ({ name, perM2: value(list, perM2) }))
      .filter((a): a is AreaRow => a.perM2 !== null)
      .sort((a, b) => b.perM2.value - a.perM2.value);

    return {
      slug: reg.slug,
      name: reg.name,
      perM2: value(sized, perM2),
      saleMedian: value(sale, (p) => p),
      rentMedian: value(rent, (p) => p),
      beds,
      areas,
      saleCount: sale.length,
      rentCount: rent.length,
    };
  }).filter((c) => c.saleCount + c.rentCount > 0);

  const rising = cities
    .flatMap((c) => c.areas.map((a) => ({ ...a, city: c.name })))
    .filter((a) => a.perM2.change !== null && a.perM2.change > 0)
    .sort((a, b) => b.perM2.change! - a.perM2.change!)
    .slice(0, 5);

  return { month, cities, rising, total: homes.length };
}

/** Рядки CSV для журналістів: одна метрика на рядок, без форматування валюти */
export function priceIndexCsv(ix: PriceIndex): string[][] {
  const out: string[][] = [['month', 'city', 'metric', 'beds', 'value_usd', 'change_yoy_pct', 'listings']];
  const m = ix.month.slice(0, 7);
  const push = (city: string, metric: string, beds: string, v: IndexValue | null) => {
    if (v) out.push([m, city, metric, beds, String(v.value), v.change === null ? '' : String(v.change), String(v.count)]);
  };
  for (const c of ix.cities) {
    push(c.name, 'sale_price_per_m2', 'all', c.perM2);
    push(c.name, 'sale_price_median', 'all', c.saleMedian);
    push(c.name, 'rent_month_median', 'all', c.rentMedian);
    for (const b of c.beds) {
      const label = b.beds === 3 ? '3+' : b.beds === 0 ? 'studio' : String(b.beds);
      push(c.name, 'sale_price_median', label, b.sale);
      push(c.name, 'rent_month_median', label, b.rent);
      if (b.yieldPct !== null) out.push([m, c.name, 'gross_rental_yield_pct', label, String(b.yieldPct), '', '']);
    }
    for (const a of c.areas) push(`${c.name} / ${a.name}`, 'sale_price_per_m2', 'all', a.perM2);
  }
  return out;
}
