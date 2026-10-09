import { DETAIL_FIELDS } from './details';
import { QUALITY_CHECKS } from './quality';
import type { Listing } from './types';

/**
 * Повнота оголошення для ріелтора: відсоток і підказки, що додати.
 * Адмінські перевірки (lib/quality.ts) — про ризики; тут — про те, що бачить покупець.
 * Вага — наскільки пункт впливає на звернення; пункти, що до обʼєкта не стосуються, не рахуємо.
 */
type Scored = Pick<Listing, 'type' | 'deal' | 'photos' | 'text' | 'price' | 'sqft' | 'lotAcres' | 'beds' | 'baths'
  | 'lat' | 'lng' | 'neighborhood' | 'titled' | 'land' | 'details' | 'photoRooms' | 'developmentId' | 'floorplan' | 'sourceName'>;

type Check = { key: string; weight: number; hint: string; applies?: (l: Scored) => boolean; ok: (l: Scored) => boolean };

const isLand = (l: Scored) => l.type === 'land';
const offIsland = QUALITY_CHECKS.find((c) => c.key === 'offIsland')!.test;
// типова точка, яку база ставить, коли координат не дали
const defaultPin = (l: Scored) => l.lat === 16.3 && l.lng === -86.59;
const detailsFor = (l: Scored) => DETAIL_FIELDS.filter((f) => !f.rentOnly || l.deal === 'rent');

const CHECKS: Check[] = [
  { key: 'photo', weight: 20, hint: 'Add photos — listings without photos get almost no enquiries',
    ok: (l) => l.photos.length > 0 },
  { key: 'photos5', weight: 10, hint: 'Add at least 5 photos', ok: (l) => l.photos.length >= 5 },
  { key: 'photos10', weight: 5, hint: 'Add 10 or more photos to show every room', ok: (l) => l.photos.length >= 10 },
  { key: 'rooms', weight: 4, hint: 'Tag photos by room so buyers can use the photo tour',
    applies: (l) => !isLand(l) && l.photos.length >= 3,
    ok: (l) => Object.keys(l.photoRooms ?? {}).length >= Math.ceil(l.photos.length / 2) },
  { key: 'text', weight: 10, hint: 'Write a description of at least 40 characters', ok: (l) => l.text.trim().length >= 40 },
  { key: 'text300', weight: 8, hint: 'Expand the description to 300+ characters: views, condition, what is nearby',
    ok: (l) => l.text.trim().length >= 300 },
  { key: 'price', weight: 10, hint: 'Set a price', ok: (l) => l.price > 0 },
  { key: 'area', weight: 8, hint: 'Add the living area', applies: (l) => !isLand(l), ok: (l) => l.sqft > 0 },
  { key: 'lot', weight: 8, hint: 'Add the lot size', applies: isLand, ok: (l) => l.lotAcres > 0 },
  { key: 'rooms_count', weight: 5, hint: 'Add bedrooms and bathrooms',
    applies: (l) => l.type === 'house' || l.type === 'condo', ok: (l) => l.baths > 0 },
  { key: 'pin', weight: 8, hint: 'Put the pin on the map where the property is',
    ok: (l) => !defaultPin(l) && !offIsland(l) },
  { key: 'area_name', weight: 3, hint: 'Choose the neighbourhood', ok: (l) => Boolean(l.neighborhood.trim()) },
  { key: 'details', weight: 7, hint: 'Fill in the property details: condition, A/C, water, parking…',
    applies: (l) => !isLand(l),
    ok: (l) => detailsFor(l).filter((f) => l.details?.[f.key]).length >= Math.min(4, detailsFor(l).length) },
  { key: 'floorplan', weight: 4, hint: 'Upload the unit floor plan', applies: (l) => !!l.developmentId, ok: (l) => !!l.floorplan },
  { key: 'titled', weight: 7, hint: 'Confirm the land is titled (if it is)', applies: isLand, ok: (l) => l.titled },
  { key: 'landcheck', weight: 5, hint: 'Fill in the land check: access, utilities, survey', applies: isLand,
    ok: (l) => !!l.land?.checkedAt },
];

export type ListingScore = { pct: number; hints: string[] };

export function listingScore(l: Scored): ListingScore {
  let total = 0;
  let got = 0;
  const miss: Check[] = [];
  for (const c of CHECKS) {
    if (c.applies && !c.applies(l)) continue;
    total += c.weight;
    if (c.ok(l)) got += c.weight; else miss.push(c);
  }
  return {
    pct: total ? Math.round((got / total) * 100) : 100,
    hints: miss.sort((a, b) => b.weight - a.weight).map((c) => c.hint),
  };
}

/** Тон для відсотка: зелений від 80, жовтий від 50 */
export const scoreTone = (pct: number) => (pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low');
