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

/** Новобудова: хто будує, коли здача, чи йдуть продажі. Зберігається в listings.project (міграція 0031). */
export const SALES_STATUSES = [
  ['open', 'Sales open'],
  ['presale', 'Pre-sale'],
  ['closed', 'Sold out'],
] as const;

export type SalesStatus = (typeof SALES_STATUSES)[number][0];

export interface ProjectInfo {
  developer: string;
  /** вільним текстом, як у забудовника: «Q4 2026», «Dec 2027» */
  completion: string;
  sales: SalesStatus;
  website: string;
}

export const EMPTY_PROJECT: ProjectInfo = { developer: '', completion: '', sales: 'open', website: '' };

const SALES_KEYS = new Set<string>(SALES_STATUSES.map(([k]) => k));
export const salesLabel = (s: string) => SALES_STATUSES.find(([k]) => k === s)?.[1] ?? 'Sales open';

export function cleanProject(input: unknown): ProjectInfo {
  const r = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const website = str(r.website, 200);
  return {
    developer: str(r.developer, 80),
    completion: str(r.completion, 40),
    sales: (SALES_KEYS.has(String(r.sales)) ? r.sales : 'open') as SalesStatus,
    website: /^https?:\/\//i.test(website) ? website : website ? `https://${website}` : '',
  };
}

export interface UnitGroup {
  beds: number;
  label: string;
  units: Unit[];
  available: number;
  m2: [number, number] | null;
  sqft: [number, number] | null;
  /** ціна за м² — лише по юнітах, де площа відома */
  perM2: [number, number] | null;
  from: number;
}

const range = (xs: number[]): [number, number] | null => (xs.length ? [Math.min(...xs), Math.max(...xs)] : null);

export const groupLabel = (beds: number) => (beds === 0 ? 'Studios' : beds === 1 ? '1 bedroom' : `${beds} bedrooms`);

/** Зведення «як у забудовника»: рядок на тип квартири з діапазонами площ і цін. */
export function groupUnits(units: Unit[]): UnitGroup[] {
  const byBeds = new Map<number, Unit[]>();
  for (const u of units) byBeds.set(u.beds, [...(byBeds.get(u.beds) ?? []), u]);
  return [...byBeds.entries()].sort(([a], [b]) => a - b).map(([beds, list]) => {
    const sorted = [...list].sort((a, b) => (a.floor ?? 0) - (b.floor ?? 0) || a.unit.localeCompare(b.unit, 'en', { numeric: true }));
    return {
      beds,
      label: groupLabel(beds),
      units: sorted,
      available: list.filter((u) => u.status === 'available').length,
      m2: range(list.flatMap((u) => (u.m2 !== null ? [u.m2] : []))),
      sqft: range(list.flatMap((u) => (u.sqft !== null ? [u.sqft] : []))),
      perM2: range(list.flatMap((u) => (u.m2 ? [Math.round(u.price / u.m2)] : []))),
      from: fromPrice(list) ?? 0,
    };
  });
}
