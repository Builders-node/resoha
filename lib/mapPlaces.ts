import { translate, type Lang } from './i18n';

/**
 * Спільний шар місць на карті (міграція 0070): пляжі, дайв-сайти, школи, лікарні, пороми,
 * аеропорти, марини. Веде адмін; бачать усі на карті пошуку й на сторінці обʼєкта.
 */
export const PLACE_KINDS = [
  ['beach', 'Beach', '🏖️'],
  ['dive', 'Dive site', '🤿'],
  ['school', 'School', '🎓'],
  ['hospital', 'Hospital', '🏥'],
  ['ferry', 'Ferry', '⛴️'],
  ['airport', 'Airport', '✈️'],
  ['marina', 'Marina', '⚓'],
] as const;

export type PlaceKind = (typeof PLACE_KINDS)[number][0];

export type MapPlace = {
  id: string;
  kind: PlaceKind;
  name: string;
  nameEs: string;
  lat: number;
  lng: number;
  note: string;
  active: boolean;
};

const KIND_KEYS = new Set<string>(PLACE_KINDS.map(([k]) => k));
export const isPlaceKind = (v: unknown): v is PlaceKind => typeof v === 'string' && KIND_KEYS.has(v);
export const kindLabel = (k: string) => PLACE_KINDS.find(([x]) => x === k)?.[1] ?? 'Place';
export const kindIcon = (k: string) => PLACE_KINDS.find(([x]) => x === k)?.[2] ?? '📍';
export const placeName = (p: Pick<MapPlace, 'name' | 'nameEs'>, lang: Lang) => (lang === 'es' && p.nameEs) || p.name;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapPlace = (r: Record<string, any>): MapPlace => ({
  id: r.id, kind: r.kind, name: r.name, nameEs: r.name_es ?? '', lat: Number(r.lat), lng: Number(r.lng),
  note: r.note ?? '', active: r.active !== false,
});

/** Дані з форми адміна → рядок таблиці; null — щось не так */
export function cleanPlace(v: Record<string, unknown>): Record<string, unknown> | null {
  const name = String(v.name ?? '').trim().slice(0, 120);
  const lat = Number(v.lat), lng = Number(v.lng);
  if (!name || !isPlaceKind(v.kind) || !Number.isFinite(lat) || !Number.isFinite(lng)
    || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return {
    kind: v.kind, name, name_es: String(v.nameEs ?? '').trim().slice(0, 120),
    lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6,
    note: String(v.note ?? '').trim().slice(0, 300),
    ...(v.active === undefined ? {} : { active: Boolean(v.active) }),
  };
}

/** «16.3168, -86.523» з Google Maps → координати */
export function parseLatLng(s: string): [number, number] | null {
  const m = s.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}

/** Відстань по прямій, км. Своя копія: lib/similar тягне базу, а цей модуль іде й у браузер */
function distanceKm(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Найближче місце кожного виду — для «Що поруч» на сторінці обʼєкта. Далі maxKm не показуємо. */
export function nearestByKind(places: MapPlace[], from: { lat: number; lng: number }, maxKm = 40) {
  const best = new Map<PlaceKind, { place: MapPlace; km: number }>();
  for (const p of places) {
    const d = distanceKm([from.lat, from.lng], [p.lat, p.lng]);
    if (d > maxKm) continue;
    const cur = best.get(p.kind);
    if (!cur || d < cur.km) best.set(p.kind, { place: p, km: d });
  }
  return PLACE_KINDS.map(([k]) => best.get(k)).filter((x): x is { place: MapPlace; km: number } => Boolean(x));
}

export const fmtKm = (d: number, lang: Lang) => translate(lang, '{len} straight line', {
  len: d < 1 ? `${Math.max(10, Math.round(d * 100) * 10)} m` : `${d.toFixed(d < 10 ? 1 : 0)} km`,
});
