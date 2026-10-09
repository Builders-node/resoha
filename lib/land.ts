import type { LandFacts } from './types';
import { PROPERTY_TAX_RATE, TYPICAL_CLOSING } from './purchaseCosts';

/**
 * «Паспорт ділянки»: єдине місце, де описано, що ми питаємо про землю і як
 * з відповідей складається оцінка готовності. Картка, сторінка, форма, фільтр,
 * PDF і адмінка беруть усе звідси.
 */
export type LandKey = keyof Omit<LandFacts, 'ready' | 'checkedAt' | 'checkedBy'>;

export type LandField = {
  key: LandKey;
  label: string;
  /** код → підпис; перший варіант — «добре», unknown завжди останній */
  options: [string, string][];
  /** відповіді, що зараховуються в індекс готовності; поля без good — довідкові */
  good?: string[];
  /** у довідкових полях — відповіді, які варто підсвітити як проблему */
  bad?: string[];
};

export const LAND_FIELDS: LandField[] = [
  { key: 'titleStatus', label: 'Title', good: ['registered'], options: [
    ['registered', 'Registered, free & clear'], ['in_progress', 'Being registered'],
    ['none', 'No title — possession only'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'roadAccess', label: 'Road access', good: ['paved', 'gravel'], options: [
    ['paved', 'Paved road'], ['gravel', 'Gravel or dirt road'], ['none', 'No road yet'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'power', label: 'Electricity', good: ['at_lot', 'nearby'], options: [
    ['at_lot', 'RECO line at the lot'], ['nearby', 'Line nearby'], ['none', 'No power nearby'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'water', label: 'Water', good: ['well', 'cistern', 'municipal'], options: [
    ['well', 'Well'], ['cistern', 'Cistern / rain catchment'], ['municipal', 'Municipal supply'],
    ['none', 'None'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'survey', label: 'Survey', options: [
    ['yes', 'Topographic survey on file'], ['no', 'No survey'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'zolitur', label: 'ZOLITUR building permit', options: [
    ['yes', 'Granted'], ['no', 'Not applied for'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'zone', label: 'Zone', options: [
    ['residential', 'Residential'], ['tourism', 'Tourism'], ['protected', 'Protected area'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'slope', label: 'Slope', options: [
    ['flat', 'Flat'], ['moderate', 'Moderate'], ['steep', 'Steep'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'view', label: 'Sea view', options: [
    ['ocean', 'Full ocean view'], ['partial', 'Partial ocean view'], ['none', 'No sea view'], ['unknown', 'Not confirmed'],
  ] },
  { key: 'beach', label: 'Beach', options: [
    ['on_beach', 'On the beach'], ['walk', 'Walk to a beach (under 10 min)'], ['drive', 'Drive to a beach'],
    ['unknown', 'Not confirmed'],
  ] },
  { key: 'internet', label: 'Internet', options: [
    ['fiber', 'Fiber or cable at the road'], ['wireless', 'Fixed wireless'], ['starlink', 'Satellite only (Starlink)'],
    ['unknown', 'Not confirmed'],
  ] },
  { key: 'flood', label: 'Flood or mangrove', bad: ['high'], options: [
    ['none', 'No flooding, no mangrove'], ['part', 'Part of the lot is low or mangrove'], ['high', 'Floods in heavy rain'],
    ['unknown', 'Not confirmed'],
  ] },
];

export const EMPTY_LAND: LandFacts = {
  titleStatus: 'unknown', survey: 'unknown', roadAccess: 'unknown', power: 'unknown',
  water: 'unknown', zolitur: 'unknown', zone: 'unknown', slope: 'unknown',
  view: 'unknown', beach: 'unknown', internet: 'unknown', flood: 'unknown',
  ready: false, checkedAt: null, checkedBy: '',
};

/** ok / bad / info / na — як підсвітити відповідь; сторінка й PDF беруть звідси */
export const landState = (field: LandField, value: string) =>
  value === 'unknown' ? 'na' as const
    : field.good ? (field.good.includes(value) ? 'ok' as const : 'bad' as const)
    : field.bad?.includes(value) ? 'bad' as const : 'info' as const;

export const landLabel = (field: LandField, value: string) =>
  field.options.find(([v]) => v === value)?.[1] ?? 'Not confirmed';

export const isChecked = (land: LandFacts | null | undefined): land is LandFacts => Boolean(land?.checkedAt);

/** Чотири базові відповіді (титул, дорога, світло, вода) → оцінка. У базі те саме правило дає колонку ready. */
export function readiness(land: LandFacts | null | undefined) {
  if (!isChecked(land)) return { score: 0, of: 4, label: 'Not checked yet', tone: 'muted' as const };
  const core = LAND_FIELDS.filter((f) => f.good);
  const score = core.filter((f) => f.good!.includes(land[f.key])).length;
  if (score === core.length) return { score, of: core.length, label: 'Ready to build', tone: 'ok' as const };
  if (score >= 2) return { score, of: core.length, label: 'Needs work', tone: 'warn' as const };
  return { score, of: core.length, label: 'Raw land', tone: 'bad' as const };
}

/* ===== Цифри, які рахуємо самі з ціни, площі й координат — агенту нічого заповнювати не треба ===== */

const SQM_PER_ACRE = 4046.86;
const SQFT_PER_ACRE = 43560;
/** Decree 90-90: іноземець на себе — до 3 000 м² (див. гайд can-foreigners-buy-property-in-roatan) */
export const FOREIGN_LIMIT_SQM = 3000;

/** Орієнтири для відстаней. Аеропорт RTB — за його координатами, решта — центри районів з AREA_CENTRES. */
const PLACES: { name: string; at: [number, number] }[] = [
  { name: 'Airport (RTB)', at: [16.3168, -86.523] },
  { name: 'Coxen Hole', at: [16.3211, -86.5383] },
  { name: 'West End', at: [16.3047, -86.5929] },
  { name: 'French Harbour', at: [16.3518, -86.4570] },
];

const km = ([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]) => {
  const rad = Math.PI / 180, dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

type Lot = { id: string; price: number; lotAcres: number; neighborhood: string; lat: number; lng: number; deal: string };

/**
 * Усе, що з паспорта виходить арифметикою. peers — інша земля на продаж (для медіани $/акр);
 * відсотки — ті самі, що в гайді roatan-closing-costs.
 */
export function landNumbers(lot: Lot, peers: Lot[]) {
  const acres = lot.lotAcres > 0 ? lot.lotAcres : 0;
  const sqm = Math.round(acres * SQM_PER_ACRE);
  const sale = lot.deal === 'sale' && lot.price > 0;
  const perAcre = sale && acres ? lot.price / acres : 0;

  const rate = (l: Lot) => l.price / l.lotAcres;
  const priced = peers.filter((l) => l.id !== lot.id && l.deal === 'sale' && l.price > 0 && l.lotAcres > 0);
  const near = priced.filter((l) => l.neighborhood === lot.neighborhood);
  // медіана з 1–2 ділянок — шум, тому від трьох; інакше по всьому острову
  const pool = near.length >= 3 ? near : priced.length >= 3 ? priced : [];
  const benchmark = pool.length ? {
    perAcre: median(pool.map(rate)),
    where: pool === near ? lot.neighborhood : 'Roatán',
    count: pool.length,
  } : null;

  return {
    acres, sqm, sqft: Math.round(acres * SQFT_PER_ACRE),
    perAcre, perSqm: perAcre ? perAcre / SQM_PER_ACRE : 0,
    benchmark,
    /** на скільки відсотків дорожче (+) чи дешевше (−) за медіану */
    vsBenchmark: perAcre && benchmark ? Math.round((perAcre / benchmark.perAcre - 1) * 100) : null,
    closing: sale ? { low: lot.price * TYPICAL_CLOSING.low, high: lot.price * TYPICAL_CLOSING.high } : null,
    /** 0.25% від кадастрової вартості; вона зазвичай нижча за ціну, тож це верхня межа */
    taxMax: sale ? lot.price * PROPERTY_TAX_RATE : 0,
    foreign: sqm ? (sqm <= FOREIGN_LIMIT_SQM ? 'personal' as const : 'company' as const) : null,
    distances: PLACES.map((p) => ({ name: p.name, km: km([lot.lat, lot.lng], p.at) })),
  };
}
