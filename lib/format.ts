import type { Deal, PropertyType } from './types';

export const TYPE_LABELS: Record<PropertyType, string> = {
  condo: 'Condo', house: 'House / Villa', land: 'Land', commercial: 'Commercial',
};
export const DEAL_LABELS: Record<Deal, string> = { sale: 'For sale', rent: 'For rent' };

export const NEIGHBORHOODS = [
  'West Bay', 'West End', 'Gibson Bight', 'Sandy Bay', 'Flowers Bay', 'Coxen Hole',
  'French Harbour', 'Parrot Tree', 'Palmetto Bay', 'Pristine Bay', 'Oak Ridge',
  'Punta Gorda', 'Camp Bay',
];

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat('en-US');

export const fmtNumber = (v: number) => num.format(v);
export const fmtUsd = (v: number) => usd.format(v);

export const fmtPrice = (v: number, deal: Deal) =>
  deal === 'rent' ? `${usd.format(v)}/mo` : usd.format(v);

/** Compact label for map pins: $1.45M, $649K, $2.4K/mo */
export const fmtPriceShort = (v: number, deal: Deal = 'sale') => {
  // оренда — точна сума ($2,400/mo), продаж — компактно ($1.45M, $649K)
  if (deal === 'rent') return `${usd.format(v)}/mo`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 ? 2 : 1).replace(/\.?0+$/, '')}M`;
  return v >= 1_000 ? `$${Math.round(v / 1_000)}K` : `$${v}`;
};

/**
 * Показуємо лише справжні фото — завантажені у Storage або з абсолютним URL.
 * Усе інше повертає '' , і компонент малює заглушку замість стокової картинки.
 */
export const photoUrl = (src?: string | null) =>
  src && (src.startsWith('/') || src.startsWith('http')) ? src : '';

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

export const nListings = (n: number) => `${num.format(n)} ${n === 1 ? 'listing' : 'listings'}`;

/** "2 bd · 2 ba · 1,240 ft²" — для землі показуємо акри */
export function specLine(l: { type: PropertyType; beds: number; baths: number; sqft: number; lotAcres: number }) {
  if (l.type === 'land') return `${l.lotAcres} ac lot`;
  // 0 спалень — це студія, а не помилка даних
  const parts = [l.beds > 0 ? `${l.beds} bd` : 'Studio', `${l.baths} ba`];
  if (l.sqft) parts.push(`${num.format(l.sqft)} ft²`);
  if (l.lotAcres) parts.push(`${l.lotAcres} ac`);
  return parts.join(' · ');
}
