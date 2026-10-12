import { queryListings } from './db';
import { AREA_CENTRES } from './format';
import type { Listing } from './types';

/**
 * «Схожі обʼєкти» на сторінці оголошення. Раніше — перші чотири з того ж району;
 * тепер — бал за ціною, типом, спальнями й відстанню, і пошук ширший за район:
 * сусідні райони потрапляють самі, бо відстань рахується в кілометрах.
 *
 * Координати: (16.3, -86.59) — точка за замовчуванням «без піна» (див. createListing),
 * такій вірити не можна — тоді беремо центр району з AREA_CENTRES.
 */

const isDefaultPin = (lat: number, lng: number) =>
  !lat || !lng || (Math.abs(lat - 16.3) < 1e-4 && Math.abs(lng + 86.59) < 1e-4);

/** Де обʼєкт насправді: пін, якщо він справжній, інакше центр району; null — невідомо */
export function placeOf(l: Pick<Listing, 'lat' | 'lng' | 'neighborhood'>): [number, number] | null {
  if (!isDefaultPin(l.lat, l.lng)) return [l.lat, l.lng];
  return AREA_CENTRES[l.neighborhood] ?? null;
}

/** Відстань по прямій, км (гаверсинус) */
export function distanceKm(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const isLand = (t: Listing['type']) => t === 'land';

/**
 * Менше — схожіше. Одиниці підібрані так, що «1» — це помітна різниця:
 * ціна в півтора раза, тип, дві спальні, три кілометри.
 */
export function similarityScore(base: Listing, l: Listing) {
  let s = 0;
  // земля й житло — різні ринки: інше показуємо, лише якщо зовсім нічого немає
  if (isLand(base.type) !== isLand(l.type)) s += 6;
  else if (base.type !== l.type) s += 1.2;

  if (base.price > 0 && l.price > 0) s += Math.min(4, Math.abs(Math.log(l.price / base.price)) / Math.log(1.5));
  else s += 1.5;

  if (!isLand(base.type) && !isLand(l.type)) s += Math.min(3, Math.abs(l.beds - base.beds) * 0.5);

  const a = placeOf(base), b = placeOf(l);
  if (a && b) s += Math.min(4, distanceKm(a, b) / 3);
  else s += l.neighborhood === base.neighborhood ? 0.3 : 2;
  if (l.neighborhood === base.neighborhood) s -= 0.3;

  if (base.oceanfront && l.oceanfront) s -= 0.3;
  return s;
}

/** n найсхожіших живих обʼєктів тієї ж угоди, крім skip (сам обʼєкт і його сусіди по ЖК) */
export async function similarListings(base: Listing, skip: Set<string>, n = 4): Promise<Listing[]> {
  const pool = await queryListings({ deal: base.deal }).catch(() => [] as Listing[]);
  return rankSimilar(base, pool, skip, n);
}

export function rankSimilar(base: Listing, pool: Listing[], skip: Set<string>, n = 4) {
  // з одного ЖК — не більше двох, щоб блок не перетворився на ще один список квартир того ж дому
  const perDev = new Map<string, number>();
  const out: Listing[] = [];
  const ranked = pool
    .filter((l) => l.id !== base.id && !skip.has(l.id))
    .map((l) => ({ l, s: similarityScore(base, l) }))
    .sort((x, y) => x.s - y.s);
  for (const { l } of ranked) {
    if (out.length >= n) break;
    const dev = l.developmentId ?? '';
    if (dev && (dev === base.developmentId || (perDev.get(dev) ?? 0) >= 2)) continue;
    if (dev) perDev.set(dev, (perDev.get(dev) ?? 0) + 1);
    out.push(l);
  }
  return out;
}
