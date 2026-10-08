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
  /** «В квартирі є», як у LUN: ключі з IN_UNIT */
  inUnit?: string[];
};

export type DetailField = {
  key: DetailKey;
  label: string;
  options: [string, string][];
  /** лише для оренди */
  rentOnly?: boolean;
  /** іконка в блоці «Details» на сторінці обʼєкта */
  icon: string;
  /** підпис після значення, коли саме значення без нього незрозуміле («Generator · backup power») */
  hint?: string;
};

export const DETAIL_FIELDS: DetailField[] = [
  { key: 'condition', label: 'Condition', icon: 'sparkle', options: [
    ['new', 'New build'], ['renovated', 'Renovated'], ['good', 'Good, move-in ready'],
    ['needs_work', 'Needs work'], ['shell', 'Shell / unfinished'],
  ] },
  { key: 'furnished', label: 'Furniture', icon: 'sofa', options: [
    ['furnished', 'Fully furnished'], ['partly', 'Partly furnished'], ['unfurnished', 'Unfurnished'],
  ] },
  { key: 'construction', label: 'Construction', icon: 'bricks', hint: 'construction', options: [
    ['concrete', 'Concrete block'], ['wood', 'Wood frame'], ['mixed', 'Concrete and wood'], ['steel', 'Steel frame'],
  ] },
  { key: 'parking', label: 'Parking', icon: 'car', options: [
    ['garage', 'Garage'], ['covered', 'Covered parking'], ['open', 'Open parking'], ['street', 'Street parking'], ['none', 'No parking'],
  ] },
  { key: 'ac', label: 'Air conditioning', icon: 'snow', options: [
    ['central', 'Central A/C'], ['split', 'Split units in every room'], ['some', 'Some rooms'], ['none', 'No A/C'],
  ] },
  { key: 'water', label: 'Water', icon: 'drop', hint: 'water', options: [
    ['municipal', 'Municipal supply'], ['well', 'Well'], ['cistern', 'Cistern / rain catchment'],
    ['municipal_cistern', 'Municipal + cistern backup'],
  ] },
  { key: 'power', label: 'Backup power', icon: 'bolt', hint: 'backup power', options: [
    ['generator', 'Generator'], ['solar', 'Solar'], ['battery', 'Battery / inverter'], ['none', 'Grid only'],
  ] },
  { key: 'outdoor', label: 'Outdoor space', icon: 'balcony', options: [
    ['balcony', 'Balcony'], ['terrace', 'Terrace'], ['garden', 'Private garden'], ['rooftop', 'Rooftop deck'], ['none', 'None'],
  ] },
  { key: 'pool', label: 'Pool', icon: 'wave', options: [
    ['private', 'Private pool'], ['shared', 'Shared pool'], ['none', 'No pool'],
  ] },
  { key: 'view', label: 'View', icon: 'eye', hint: 'view', options: [
    ['ocean', 'Ocean view'], ['partial', 'Partial ocean view'], ['garden', 'Garden or pool view'], ['hills', 'Hills or jungle'], ['street', 'Street'],
  ] },
  { key: 'pets', label: 'Pets', rentOnly: true, icon: 'paw', hint: 'pets', options: [
    ['yes', 'Pets allowed'], ['ask', 'On request'], ['no', 'No pets'],
  ] },
];

/**
 * «В квартирі є» — що стоїть у самій квартирі, як у LUN: техніка й зручності.
 * Ріелтор ставить галочки; на сторінці — сітка з іконками, порожнє не показуємо.
 */
export const IN_UNIT: [key: string, label: string, icon: string][] = [
  ['kitchen', 'Kitchen', 'kitchen'],
  ['stove', 'Stove', 'stove'],
  ['oven', 'Oven', 'stove'],
  ['fridge', 'Fridge', 'fridge'],
  ['microwave', 'Microwave', 'microwave'],
  ['dishwasher', 'Dishwasher', 'dishwasher'],
  ['washer', 'Washing machine', 'washer'],
  ['dryer', 'Dryer', 'washer'],
  ['ac', 'Air conditioning', 'snow'],
  ['fans', 'Ceiling fans', 'fan'],
  ['water_heater', 'Water heater', 'heater'],
  ['shower', 'Shower', 'shower'],
  ['bathtub', 'Bathtub', 'bath'],
  ['tv', 'TV', 'tv'],
  ['wifi', 'Wi-Fi', 'wifi'],
  ['safe', 'Safe', 'safe'],
];

/** Те, що прийшло з форми чи з бази, — лише відомі ключі й відомі значення. */
export function cleanDetails(raw: unknown): ListingDetails {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out: ListingDetails = {};
  for (const f of DETAIL_FIELDS) {
    const v = src[f.key];
    if (typeof v === 'string' && f.options.some(([k]) => k === v)) out[f.key] = v;
  }
  if (Array.isArray(src.inUnit)) {
    const keys = IN_UNIT.map(([k]) => k).filter((k) => (src.inUnit as unknown[]).includes(k));
    if (keys.length) out.inUnit = keys;
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
