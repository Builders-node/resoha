import { translate, type Lang } from './i18n';

/**
 * Характеристики обʼєкта — таблиця на сторінці, як у LUN. Ріелтор обирає зі списку,
 * тож на сторінці однакові формулювання, а порожнє поле просто не показуємо.
 * Набір полів живе тут: форма, збереження і сторінка беруть його звідси.
 */
export type DetailKey =
  | 'condition' | 'furnished' | 'construction' | 'parking' | 'ac'
  | 'water' | 'power' | 'outdoor' | 'pool' | 'view' | 'pets';

export type ListingDetails = Partial<Record<DetailKey, string>> & {
  /** поверхів у будинку — для «3 of 8» */
  floorsTotal?: number;
};

export type DetailField = {
  key: DetailKey;
  label: string;
  options: [string, string][];
  /** лише для оренди */
  rentOnly?: boolean;
};

export const DETAIL_FIELDS: DetailField[] = [
  { key: 'condition', label: 'Condition', options: [
    ['new', 'New build'], ['renovated', 'Renovated'], ['good', 'Good, move-in ready'],
    ['needs_work', 'Needs work'], ['shell', 'Shell / unfinished'],
  ] },
  { key: 'furnished', label: 'Furniture', options: [
    ['furnished', 'Fully furnished'], ['partly', 'Partly furnished'], ['unfurnished', 'Unfurnished'],
  ] },
  { key: 'construction', label: 'Construction', options: [
    ['concrete', 'Concrete block'], ['wood', 'Wood frame'], ['mixed', 'Concrete and wood'], ['steel', 'Steel frame'],
  ] },
  { key: 'parking', label: 'Parking', options: [
    ['garage', 'Garage'], ['covered', 'Covered parking'], ['open', 'Open parking'], ['street', 'Street parking'], ['none', 'No parking'],
  ] },
  { key: 'ac', label: 'Air conditioning', options: [
    ['central', 'Central A/C'], ['split', 'Split units in every room'], ['some', 'Some rooms'], ['none', 'No A/C'],
  ] },
  { key: 'water', label: 'Water', options: [
    ['municipal', 'Municipal supply'], ['well', 'Well'], ['cistern', 'Cistern / rain catchment'],
    ['municipal_cistern', 'Municipal + cistern backup'],
  ] },
  { key: 'power', label: 'Backup power', options: [
    ['generator', 'Generator'], ['solar', 'Solar'], ['battery', 'Battery / inverter'], ['none', 'Grid only'],
  ] },
  { key: 'outdoor', label: 'Outdoor space', options: [
    ['balcony', 'Balcony'], ['terrace', 'Terrace'], ['garden', 'Private garden'], ['rooftop', 'Rooftop deck'], ['none', 'None'],
  ] },
  { key: 'pool', label: 'Pool', options: [
    ['private', 'Private pool'], ['shared', 'Shared pool'], ['none', 'No pool'],
  ] },
  { key: 'view', label: 'View', options: [
    ['ocean', 'Ocean view'], ['partial', 'Partial ocean view'], ['garden', 'Garden or pool view'], ['hills', 'Hills or jungle'], ['street', 'Street'],
  ] },
  { key: 'pets', label: 'Pets', rentOnly: true, options: [
    ['yes', 'Pets allowed'], ['ask', 'On request'], ['no', 'No pets'],
  ] },
];

/** Те, що прийшло з форми чи з бази, — лише відомі ключі й відомі значення. */
export function cleanDetails(raw: unknown): ListingDetails {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: ListingDetails = {};
  for (const f of DETAIL_FIELDS) {
    const v = src[f.key];
    if (typeof v === 'string' && f.options.some(([k]) => k === v)) out[f.key] = v;
  }
  const floors = Math.round(Number(src.floorsTotal));
  if (Number.isFinite(floors) && floors >= 1 && floors <= 200) out.floorsTotal = floors;
  return out;
}

export const detailLabel = (f: DetailField, v: string | undefined) =>
  (v && f.options.find(([k]) => k === v)?.[1]) || '';

/** «3 of 8», «3», «8-storey building» — або нічого */
export function floorLine(floor: number | null, floorsTotal?: number, lang: Lang = 'en') {
  if (floor !== null && floorsTotal) return translate(lang, '{floor} of {total}', { floor, total: floorsTotal });
  if (floor !== null) return String(floor);
  if (floorsTotal) return translate(lang, '{n}-storey building', { n: floorsTotal });
  return '';
}
