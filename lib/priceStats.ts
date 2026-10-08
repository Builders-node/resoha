import { SQFT_PER_M2 } from './format';
import type { Deal, StatRow } from './types';

/**
 * Статистика цін у стилі ЛУН: медіана за кількістю спалень (каталог) і ціна за m²
 * по містах острова (головна). Рахуємо з відкритих житлових оголошень (квартири й
 * будинки), а зміну за рік — з історії цін listing_prices.
 */

/** Менше точок — медіана нічого не каже, групу не показуємо */
const MIN_NOW = 2;
/** Відсоток за рік — лише коли рік тому в групі було хоча б стільки оголошень */
const MIN_THEN = 3;

export interface StatValue {
  value: number;
  /** зміна за рік у відсотках, до десятих; null — історії замало, бейдж ховаємо */
  change: number | null;
  count: number;
}

export interface RoomStat extends StatValue {
  /** 0 — студія, 3 — «3+» */
  beds: number;
}

export interface CityStat {
  name: string;
  /** ціна за m² по всіх квартирах і будинках міста */
  all: StatValue;
  /** розбивка за типом — замість класів ЛУН, яких на острові немає */
  rows: { type: 'condo' | 'house'; stat: StatValue }[];
}

export interface PriceStats {
  /** перший день поточного місяця — підпис «October 2026» */
  month: string;
  /** той самий місяць рік тому — «vs 10.2025» */
  since: string;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Медіана зараз і медіана тих самих ринкових цін рік тому */
function stat(rows: StatRow[], value: (price: number, r: StatRow) => number): StatValue | null {
  if (rows.length < MIN_NOW) return null;
  const now = median(rows.map((r) => value(r.price, r)));
  const old = rows.filter((r) => r.priceThen !== null).map((r) => value(r.priceThen!, r));
  const then = old.length >= MIN_THEN ? median(old) : 0;
  return {
    value: Math.round(now),
    change: then > 0 ? Math.round(((now - then) / then) * 1000) / 10 : null,
    count: rows.length,
  };
}

/** Дата, на яку беремо «рік тому» */
export const yearAgo = (now = new Date()) => {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
};

export const statsPeriod = (now = new Date()): PriceStats => {
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const since = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1));
  return { month: month.toISOString(), since: since.toISOString() };
};

/** Студія, 1, 2 і 3+ спальні — як 1-, 2-, 3-кімнатні у ЛУН */
export function roomStats(rows: StatRow[], deal: Deal): RoomStat[] {
  const own = rows.filter((r) => r.deal === deal);
  return [0, 1, 2, 3].flatMap((beds) => {
    const s = stat(own.filter((r) => (beds === 3 ? r.beds >= 3 : r.beds === beds)), (p) => p);
    return s ? [{ beds, ...s }] : [];
  });
}

/** Ціна продажу за m² по містах: найбільші ринки першими, не більше `limit` */
export function cityStats(rows: StatRow[], limit = 4): CityStat[] {
  const perM2 = (price: number, r: StatRow) => (price / r.sqft) * SQFT_PER_M2;
  const sale = rows.filter((r) => r.deal === 'sale' && r.sqft > 0);
  const byCity = new Map<string, StatRow[]>();
  sale.forEach((r) => byCity.set(r.neighborhood, [...(byCity.get(r.neighborhood) ?? []), r]));

  return [...byCity.entries()]
    .filter(([, list]) => list.length >= 3)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, limit)
    .map(([name, list]) => ({
      name,
      all: stat(list, perM2)!,
      rows: (['condo', 'house'] as const).flatMap((type) => {
        const s = stat(list.filter((r) => r.type === type), perM2);
        return s ? [{ type, stat: s }] : [];
      }),
    }));
}
