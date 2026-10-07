import { translate, type Lang } from './i18n';

/**
 * Місця поблизости, які ріелтор додає руками: кафе, пляж, дайв-центр, супермаркет.
 * Зберігаються jsonb-масивом у listings.nearby (міграція 0028).
 */

export const NEARBY_CATEGORIES = [
  ['restaurant', 'Restaurant'],
  ['cafe', 'Café'],
  ['bar', 'Bar'],
  ['beach', 'Beach'],
  ['park', 'Park'],
  ['dive', 'Dive shop'],
  ['supermarket', 'Supermarket'],
  ['pharmacy', 'Pharmacy'],
  ['hospital', 'Hospital / clinic'],
  ['school', 'School'],
  ['gym', 'Gym'],
  ['marina', 'Marina'],
  ['other', 'Other'],
] as const;

export type NearbyCategory = (typeof NEARBY_CATEGORIES)[number][0];

export const NEARBY_UNITS = [
  ['m', 'm'],
  ['km', 'km'],
  ['walk', 'min walk'],
  ['drive', 'min drive'],
] as const;

export type NearbyUnit = (typeof NEARBY_UNITS)[number][0];

export interface NearbyPlace {
  name: string;
  category: NearbyCategory;
  /** відстань або час — необовʼязково; null, коли ріелтор не вказав */
  distance: number | null;
  unit: NearbyUnit;
  /** точка на карті — необовʼязково */
  lat: number | null;
  lng: number | null;
}

export const NEARBY_MAX = 20;

export const EMPTY_PLACE: NearbyPlace = { name: '', category: 'restaurant', distance: null, unit: 'walk', lat: null, lng: null };

const CATEGORY_KEYS = new Set<string>(NEARBY_CATEGORIES.map(([k]) => k));
const UNIT_KEYS = new Set<string>(NEARBY_UNITS.map(([k]) => k));

export const categoryLabel = (c: string) => NEARBY_CATEGORIES.find(([k]) => k === c)?.[1] ?? 'Other';

const num = (v: unknown) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Те, що прийшло з форми чи з бази, приводимо до чистого вигляду: без порожніх назв і сміття. */
export function cleanNearby(input: unknown): NearbyPlace[] {
  if (!Array.isArray(input)) return [];
  return input.flatMap((raw): NearbyPlace[] => {
    if (!raw || typeof raw !== 'object') return [];
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name.trim().slice(0, 80) : '';
    if (!name) return [];
    const distance = num(r.distance);
    const lat = num(r.lat), lng = num(r.lng);
    const hasPoint = lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    return [{
      name,
      category: (CATEGORY_KEYS.has(String(r.category)) ? r.category : 'other') as NearbyCategory,
      distance: distance !== null && distance > 0 && distance < 100_000 ? distance : null,
      unit: (UNIT_KEYS.has(String(r.unit)) ? r.unit : 'walk') as NearbyUnit,
      lat: hasPoint ? lat : null,
      lng: hasPoint ? lng : null,
    }];
  }).slice(0, NEARBY_MAX);
}

const km = ([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]) => {
  const rad = Math.PI / 180, dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
};

/**
 * Що показати поруч із назвою. Відстань від ріелтора головніша; якщо її немає,
 * а точка на карті є — рахуємо по прямій від обʼєкта.
 */
export function nearbyDistance(p: NearbyPlace, from: { lat: number; lng: number }, lang: Lang = 'en'): string {
  if (p.distance !== null) {
    if (p.unit === 'walk') return translate(lang, '{n} min walk', { n: p.distance });
    if (p.unit === 'drive') return translate(lang, '{n} min drive', { n: p.distance });
    return `${p.distance} ${p.unit}`;
  }
  if (p.lat !== null && p.lng !== null) {
    const d = km([from.lat, from.lng], [p.lat, p.lng]);
    const len = d < 1 ? `${Math.max(10, Math.round(d * 100) * 10)} m` : `${d.toFixed(d < 10 ? 1 : 0)} km`;
    return translate(lang, '{len} straight line', { len });
  }
  return '';
}
