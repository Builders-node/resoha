/**
 * ЖК і квартири в ньому. ЖК — таблиця developments (міграція 0032), квартира —
 * звичайне оголошення з development_id, номером, поверхом і станом.
 */

export const UNIT_STATUSES = [
  ['available', 'Available'],
  ['reserved', 'Reserved'],
  ['sold', 'Sold'],
  ['rented', 'Rented'],
] as const;

export type UnitStatus = (typeof UNIT_STATUSES)[number][0];

const STATUS_KEYS = new Set<string>(UNIT_STATUSES.map(([k]) => k));
export const cleanStatus = (s: unknown): UnitStatus => (STATUS_KEYS.has(String(s)) ? s : 'available') as UnitStatus;
export const statusLabel = (s: string) => UNIT_STATUSES.find(([k]) => k === s)?.[1] ?? 'Available';
/** Продану чи здану квартиру лишаємо в ЖК, але не в загальному пошуку */
export const OPEN_STATUSES: UnitStatus[] = ['available', 'reserved'];

export const SALES_STATUSES = [
  ['open', 'Sales open'],
  ['presale', 'Pre-sale'],
  ['closed', 'Sold out'],
] as const;

export type SalesStatus = (typeof SALES_STATUSES)[number][0];

const SALES_KEYS = new Set<string>(SALES_STATUSES.map(([k]) => k));
export const cleanSales = (s: unknown): SalesStatus => (SALES_KEYS.has(String(s)) ? s : 'open') as SalesStatus;
export const salesLabel = (s: string) => SALES_STATUSES.find(([k]) => k === s)?.[1] ?? 'Sales open';

/** «Duna Tower» → «duna-tower»; для адреси сторінки ЖК */
export const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

export const groupLabel = (beds: number) => (beds === 0 ? 'Studios' : beds === 1 ? '1 bedroom' : `${beds} bedrooms`);
export const unitTypeLabel = (beds: number) => (beds > 0 ? `${beds} Bedroom` : 'Studio');

export const SQFT_PER_M2 = 10.7639;
export const toM2 = (sqft: number) => Math.round((sqft / SQFT_PER_M2) * 10) / 10;

/** Рядок прайсу, вставленого з таблиці забудовника — ще не оголошення */
export interface PriceRow {
  unit: string;
  beds: number;
  floor: number | null;
  sqft: number;
  price: number;
}

const num = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/**
 * Прайс з Excel, Google Sheets чи PDF: рядок на квартиру, колонки
 * «unit, type, floor, m², ft², price». Тип — «Studio» або «2 Bedroom».
 * Якщо ft² немає, рахуємо з m².
 */
export function parsePriceList(text: string): PriceRow[] {
  return text.split('\n').flatMap((line): PriceRow[] => {
    const cells = line.split(/\t|\s{2,}|;|\|/).map((c) => c.trim()).filter(Boolean);
    if (cells.length < 5) return [];
    const [unit, type, floorRaw, m2Raw, ...rest] = cells;
    const price = num(rest[rest.length - 1]);
    const sqftRaw = rest.length > 1 ? num(rest[0]) : null;
    const m2 = num(m2Raw);
    const sqft = sqftRaw ?? (m2 ? Math.round(m2 * SQFT_PER_M2) : null);
    if (!unit || !price || price <= 0 || !sqft) return [];
    const floor = num(floorRaw);
    return [{
      unit: unit.slice(0, 20),
      beds: /studio/i.test(type) ? 0 : Number((type.match(/\d+/) ?? ['0'])[0]),
      floor: floor !== null ? Math.round(floor) : null,
      sqft: Math.round(sqft),
      price,
    }];
  });
}

/** Квартира, як її бачить блок ЖК: досить полів оголошення */
export interface UnitLike {
  id: string;
  unitNo: string;
  beds: number;
  floor: number | null;
  sqft: number;
  price: number;
  status: UnitStatus;
}

export interface UnitGroup<U extends UnitLike> {
  beds: number;
  label: string;
  units: U[];
  available: number;
  m2: [number, number] | null;
  sqft: [number, number] | null;
  perM2: [number, number] | null;
  from: number;
}

const range = (xs: number[]): [number, number] | null => (xs.length ? [Math.min(...xs), Math.max(...xs)] : null);

/** Найдешевша вільна квартира (або просто найдешевша, якщо вільних нема) */
export function fromPrice(units: UnitLike[]): number | null {
  if (!units.length) return null;
  const open = units.filter((u) => u.status === 'available');
  return Math.min(...(open.length ? open : units).map((u) => u.price));
}

/** Зведення «як у забудовника»: рядок на тип квартири з діапазонами площ і цін. */
export function groupUnits<U extends UnitLike>(units: U[]): UnitGroup<U>[] {
  const byBeds = new Map<number, U[]>();
  for (const u of units) byBeds.set(u.beds, [...(byBeds.get(u.beds) ?? []), u]);
  return [...byBeds.entries()].sort(([a], [b]) => a - b).map(([beds, list]) => {
    const sorted = [...list].sort((a, b) => (a.floor ?? 0) - (b.floor ?? 0) || a.unitNo.localeCompare(b.unitNo, 'en', { numeric: true }));
    const sized = list.filter((u) => u.sqft > 0);
    return {
      beds,
      label: groupLabel(beds),
      units: sorted,
      available: list.filter((u) => u.status === 'available').length,
      m2: range(sized.map((u) => toM2(u.sqft))),
      sqft: range(sized.map((u) => u.sqft)),
      perM2: range(sized.map((u) => Math.round(u.price / toM2(u.sqft)))),
      from: fromPrice(list) ?? 0,
    };
  });
}

/** Хто може вести ЖК і додавати в нього квартири: автор, власник його агенції, адмін */
export const canManageDevelopment = (
  dev: { agentId: string; agencyId: string | null },
  user: { id: string; agencyId: string | null; isOwner: boolean; isAdmin: boolean },
) => user.isAdmin || dev.agentId === user.id || (user.isOwner && !!dev.agencyId && dev.agencyId === user.agencyId);
