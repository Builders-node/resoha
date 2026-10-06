/**
 * Квартири в одному будинку: одне оголошення «Duna Tower» і прайс по юнітах.
 * Зберігаються jsonb-масивом у listings.units (міграція 0030).
 */

export const UNIT_STATUSES = [
  ['available', 'Available'],
  ['reserved', 'Reserved'],
  ['sold', 'Sold'],
] as const;

export type UnitStatus = (typeof UNIT_STATUSES)[number][0];

export interface Unit {
  /** номер квартири, як у прайсі: «201», «PH-2» */
  unit: string;
  /** 0 — студія */
  beds: number;
  floor: number | null;
  m2: number | null;
  sqft: number | null;
  price: number;
  status: UnitStatus;
}

export const UNITS_MAX = 300;

export const EMPTY_UNIT: Unit = { unit: '', beds: 0, floor: null, m2: null, sqft: null, price: 0, status: 'available' };

const STATUS_KEYS = new Set<string>(UNIT_STATUSES.map(([k]) => k));

export const bedsLabel = (beds: number) => (beds > 0 ? `${beds} Bedroom` : 'Studio');
export const statusLabel = (s: string) => UNIT_STATUSES.find(([k]) => k === s)?.[1] ?? 'Available';

const num = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** Те, що прийшло з форми чи з бази, приводимо до чистого вигляду: без порожніх номерів і сміття. */
export function cleanUnits(input: unknown): Unit[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((raw): Unit[] => {
    if (!raw || typeof raw !== 'object') return [];
    const r = raw as Record<string, unknown>;
    const unit = typeof r.unit === 'string' || typeof r.unit === 'number' ? String(r.unit).trim().slice(0, 20) : '';
    const price = num(r.price);
    if (!unit || price === null || price <= 0) return [];
    const beds = num(r.beds), floor = num(r.floor), m2 = num(r.m2), sqft = num(r.sqft);
    return [{
      unit,
      beds: beds !== null && beds >= 0 && beds < 20 ? Math.round(beds) : 0,
      floor: floor !== null && Math.abs(floor) < 300 ? Math.round(floor) : null,
      m2: m2 !== null && m2 > 0 && m2 < 100_000 ? m2 : null,
      sqft: sqft !== null && sqft > 0 && sqft < 1_000_000 ? Math.round(sqft) : null,
      price,
      status: (STATUS_KEYS.has(String(r.status)) ? r.status : 'available') as UnitStatus,
    }];
  }).slice(0, UNITS_MAX);
}

/** Ціна оголошення з юнітами — найдешевший вільний (або просто найдешевший, якщо все продано). */
export function fromPrice(units: Unit[]): number | null {
  if (!units.length) return null;
  const open = units.filter((u) => u.status !== 'sold');
  return Math.min(...(open.length ? open : units).map((u) => u.price));
}

/**
 * Прайс, вставлений з таблиці (Excel, Google Sheets, PDF): рядок на юніт,
 * колонки «unit, type, floor, m², ft², price». Тип — «Studio» або «2 Bedroom».
 */
export function parseUnits(text: string): Unit[] {
  return cleanUnits(text.split('\n').flatMap((line) => {
    const cells = line.split(/\t|\s{2,}|;|\|/).map((c) => c.trim()).filter(Boolean);
    if (cells.length < 6) return [];
    const [unit, type, floor, m2, sqft, price] = cells;
    const beds = /studio/i.test(type) ? 0 : Number((type.match(/\d+/) ?? ['0'])[0]);
    return [{ unit, beds, floor, m2, sqft, price, status: 'available' }];
  }));
}
