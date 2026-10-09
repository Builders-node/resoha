/**
 * Прайс забудовника як таблиця (вставка, CSV чи XLSX) і порівняння з квартирами,
 * що вже є в ЖК: що додасться, що зміниться, що лишиться як було.
 * Квартири зіставляємо за номером у межах ЖК (і дому, якщо його вибрано).
 */
import { SQFT_PER_M2, UNIT_STATUSES, parsePriceList, unitTypeLabel, type PriceRow, type UnitStatus } from './units';

export const PRICE_LIST_MAX = 500;

export interface PriceListRow extends PriceRow {
  /** Порожньо — у прайсі колонки стану немає, стан квартири не чіпаємо */
  status?: UnitStatus;
}

const num = (v: unknown) => {
  const s = String(v ?? '').replace(/[$,\s]/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const HEADERS: [keyof PriceListRow | 'type' | 'm2', RegExp][] = [
  ['unit', /^(unit|unit ?(no|#|number)|apt|apartment|no\.?|#|number)$/],
  ['type', /^(type|unit type|layout|bedrooms?|beds?)$/],
  ['floor', /^(floor|level)$/],
  ['m2', /^(m2|m²|sqm|sq\.? ?m|area|area ?m2|size ?m2|size)$/],
  ['sqft', /^(ft2|ft²|sq\.? ?ft|sqft|area ?ft2|size ?ft2)$/],
  ['price', /^(price|price ?(usd|\$)|list ?price|usd)$/],
  ['status', /^(status|availability)$/],
];

const STATUS_WORDS: [UnitStatus, RegExp][] = [
  ['available', /^(available|free|open|disponible|libre)$/],
  ['reserved', /^(reserved|on hold|hold|reservado|reservada)$/],
  ['sold', /^(sold|vendido|vendida)$/],
  ['rented', /^(rented|let|alquilado|alquilada)$/],
];
const statusOf = (v: string): UnitStatus | undefined =>
  STATUS_WORDS.find(([, re]) => re.test(v.trim().toLowerCase()))?.[0];

/** Вставка з Excel / Google Sheets → таблиця комірок */
export const splitPaste = (text: string) => text.split(/\r?\n/).map((l) => l.split(/\t|\s{2,}|;|\|/).map((c) => c.trim()));

/**
 * Таблиця → рядки прайсу. Якщо перший рядок — заголовки (unit, type, floor, m², ft², price, status),
 * колонки беремо за ними; інакше — за порядком, як у старій вставці: unit, type, floor, m², ft², price.
 */
export function parsePriceTable(table: string[][]): PriceListRow[] {
  const headIdx = table.findIndex((r) => r.some((c) => c));
  if (headIdx < 0) return [];
  const head = table[headIdx].map((c) => c.trim().toLowerCase().replace(/\s+/g, ' '));
  const col: Partial<Record<string, number>> = {};
  for (const [key, re] of HEADERS) {
    const i = head.findIndex((h) => re.test(h));
    if (i >= 0 && col[key] === undefined) col[key] = i;
  }
  if (col.unit === undefined || col.price === undefined) {
    return parsePriceList(table.map((r) => r.join('\t')).join('\n'));
  }

  const out: PriceListRow[] = [];
  for (const r of table.slice(headIdx + 1)) {
    const at = (k: string) => (col[k] !== undefined ? String(r[col[k]!] ?? '').trim() : '');
    const unit = at('unit');
    const price = num(at('price'));
    const m2 = num(at('m2'));
    const sqft = num(at('sqft')) ?? (m2 ? Math.round(m2 * SQFT_PER_M2) : null);
    if (!unit || !price || price <= 0) continue;
    const type = at('type');
    const floor = num(at('floor'));
    out.push({
      unit: unit.slice(0, 20),
      beds: /studio/i.test(type) ? 0 : Number((type.match(/\d+/) ?? ['0'])[0]),
      floor: floor !== null ? Math.round(floor) : null,
      sqft: sqft ? Math.round(sqft) : 0,
      price,
      ...(statusOf(at('status')) ? { status: statusOf(at('status')) } : {}),
    });
  }
  return out;
}

const STATUS_KEYS = new Set<string>(UNIT_STATUSES.map(([k]) => k));

/** Рядок із запиту: те саме, але нічому не віримо */
export function cleanPriceRow(v: unknown): PriceListRow | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  const unit = String(r.unit ?? '').trim().slice(0, 20);
  const price = Number(r.price);
  if (!unit || !Number.isFinite(price) || price <= 0 || price > 1e9) return null;
  const floor = r.floor === null || r.floor === undefined || r.floor === '' ? null : Math.round(Number(r.floor));
  return {
    unit,
    beds: Math.max(0, Math.min(20, Math.round(Number(r.beds) || 0))),
    floor: Number.isFinite(floor) ? floor : null,
    sqft: Math.max(0, Math.round(Number(r.sqft) || 0)),
    price: Math.round(price * 100) / 100,
    ...(STATUS_KEYS.has(String(r.status)) ? { status: r.status as UnitStatus } : {}),
  };
}

/** Квартира ЖК, як її бачить порівняння */
export interface ExistingUnit {
  id: string;
  unitNo: string;
  buildingId: string | null;
  beds: number;
  floor: number | null;
  sqft: number;
  price: number;
  status: UnitStatus;
  title: string;
}

export type UnitFields = Pick<PriceListRow, 'beds' | 'floor' | 'sqft' | 'price'> & { status: UnitStatus };

export interface PriceChange {
  id: string;
  unit: string;
  before: UnitFields;
  after: UnitFields;
  fields: (keyof UnitFields)[];
  /** Нова назва, якщо змінився тип і назва була згенерована з прайсу */
  title?: string;
}

export interface PriceDiff {
  added: PriceListRow[];
  changed: PriceChange[];
  unchanged: number;
  errors: { unit: string; message: string }[];
}

const unitKey = (s: string) => s.trim().toLowerCase().replace(/^unit\s*/, '').replace(/\s+/g, '');

export const generatedTitle = (devName: string, unit: string, beds: number) =>
  `${devName} · Unit ${unit} · ${unitTypeLabel(beds)}`;

export function diffPriceList(
  rows: PriceListRow[], existing: ExistingUnit[], opts: { buildingId: string | null; devName: string },
): PriceDiff {
  const diff: PriceDiff = { added: [], changed: [], unchanged: 0, errors: [] };
  const seen = new Set<string>();
  for (const r of rows) {
    const key = unitKey(r.unit);
    if (seen.has(key)) { diff.errors.push({ unit: r.unit, message: 'Listed twice in this price list' }); continue; }
    seen.add(key);

    const matches = existing.filter((u) => unitKey(u.unitNo) === key
      && (!opts.buildingId || !u.buildingId || u.buildingId === opts.buildingId));
    if (matches.length > 1) {
      diff.errors.push({ unit: r.unit, message: `${matches.length} units have this number — pick a building first` });
      continue;
    }
    const u = matches[0];
    if (!u) {
      if (!r.sqft) { diff.errors.push({ unit: r.unit, message: 'New unit without an area (m² or ft²)' }); continue; }
      diff.added.push(r);
      continue;
    }

    const before: UnitFields = { beds: u.beds, floor: u.floor, sqft: u.sqft, price: u.price, status: u.status };
    const after: UnitFields = {
      beds: r.beds,
      // порожня комірка не стирає наявне значення
      floor: r.floor ?? u.floor,
      sqft: r.sqft || u.sqft,
      price: r.price,
      status: r.status ?? u.status,
    };
    const fields = (Object.keys(after) as (keyof UnitFields)[]).filter((k) =>
      k === 'sqft' ? Math.abs(Number(after.sqft) - Number(before.sqft)) > 1 : after[k] !== before[k]);
    if (!fields.length) { diff.unchanged++; continue; }
    const change: PriceChange = { id: u.id, unit: u.unitNo || r.unit, before, after, fields };
    if (fields.includes('beds') && u.title === generatedTitle(opts.devName, u.unitNo, u.beds)) {
      change.title = generatedTitle(opts.devName, u.unitNo, after.beds);
    }
    diff.changed.push(change);
  }
  return diff;
}
