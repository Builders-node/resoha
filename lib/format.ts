import type { Deal, PropertyType } from './types';
import { intlLocale, translate, type Lang } from './i18n';

export const TYPE_LABELS: Record<PropertyType, string> = {
  condo: 'Condo', house: 'House / Villa', land: 'Land', commercial: 'Commercial',
};
export const DEAL_LABELS: Record<Deal, string> = { sale: 'For sale', rent: 'For rent' };

/**
 * Райони та їхні центри. Координати — з OpenStreetMap; форма ставить пін у центр
 * обраного району, щоб ріелтору не доводилось знати широту з довготою напамʼять.
 */
export const AREA_CENTRES: Record<string, [number, number]> = {
  'West Bay': [16.2752, -86.5977],
  'West End': [16.3010, -86.5964],
  'Gibson Bight': [16.3190, -86.5808],
  'Sandy Bay': [16.3208, -86.5602],
  'Flowers Bay': [16.2950, -86.5699],
  'Coxen Hole': [16.3230, -86.5374],
  'French Harbour': [16.3494, -86.4411],
  'Parrot Tree': [16.3641, -86.4131],
  'Palmetto Bay': [16.3732, -86.4245],
  'Pristine Bay': [16.366945, -86.471605],
  'Crawfish Rock': [16.3800, -86.4590],
  'Oak Ridge': [16.3958, -86.3400],
  'Punta Gorda': [16.4106, -86.3349],
  'Camp Bay': [16.4435, -86.2902],
};

export const NEIGHBORHOODS = Object.keys(AREA_CENTRES);

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
});
const num = new Intl.NumberFormat('en-US');

// числа лишаємо в en-US: «1,240» однаково читається обома мовами, а ціни — у доларах
export const fmtNumber = (v: number) => num.format(v);
export const fmtUsd = (v: number) => usd.format(v);

/* ---------- площа: зберігаємо ft², показуємо одразу ft² і m² ---------- */
export const SQFT_PER_M2 = 10.7639;
/** ft² → m²: до десятих у малих приміщень, цілі — від 100 m² */
export const sqftToM2 = (sqft: number) => {
  const m2 = sqft / SQFT_PER_M2;
  return m2 >= 100 ? Math.round(m2) : Math.round(m2 * 10) / 10;
};
export const m2ToSqft = (m2: number) => Math.round(m2 * SQFT_PER_M2);
/** «375 m² · 4,039 ft²» — m² першими, як просив власник */
export const fmtArea = (sqft: number, sep = ' · ') => `${num.format(sqftToM2(sqft))} m²${sep}${num.format(sqft)} ft²`;
/** «$1,596/m² · $148/ft²» — ціна за одиницю площі в обох одиницях */
export const fmtPerArea = (price: number, sqft: number, sep = ' · ') =>
  `${usd.format(Math.round((price / sqft) * SQFT_PER_M2))}/m²${sep}${usd.format(Math.round(price / sqft))}/ft²`;

export const fmtPrice = (v: number, deal: Deal, lang: Lang = 'en') =>
  deal === 'rent' ? `${usd.format(v)}${translate(lang, '/mo')}` : usd.format(v);

/** Compact label for map pins: $1.45M, $649K, $2.4K/mo */
export const fmtPriceShort = (v: number, deal: Deal = 'sale', lang: Lang = 'en') => {
  // оренда — точна сума ($2,400/mo), продаж — компактно ($1.45M, $649K)
  if (deal === 'rent') return `${usd.format(v)}${translate(lang, '/mo')}`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v % 1_000_000 ? 2 : 1).replace(/\.?0+$/, '')}M`;
  return v >= 1_000 ? `$${Math.round(v / 1_000)}K` : `$${v}`;
};

/**
 * Показуємо лише справжні фото — завантажені у Storage або з абсолютним URL.
 * Усе інше повертає '' , і компонент малює заглушку замість стокової картинки.
 */
export const photoUrl = (src?: string | null) =>
  src && (src.startsWith('/') || src.startsWith('http')) ? src : '';

export const fmtDate = (iso: string, lang: Lang = 'en') =>
  new Date(iso).toLocaleDateString(intlLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' });

export const nListings = (n: number, lang: Lang = 'en') =>
  translate(lang, n === 1 ? '{n} listing' : '{n} listings', { n: num.format(n) });

/** "2 bd · 2 ba · 115 m² / 1,240 ft²" — для землі показуємо акри */
export function specLine(
  l: { type: PropertyType; beds: number; baths: number; sqft: number; lotAcres: number },
  lang: Lang = 'en',
) {
  const t = (en: string, vars?: Record<string, string | number>) => translate(lang, en, vars);
  if (l.type === 'land') return t('{n} ac lot', { n: l.lotAcres });
  // 0 спалень — це студія, а не помилка даних
  const parts = [l.beds > 0 ? t('{n} bd', { n: l.beds }) : t('Studio'), t('{n} ba', { n: l.baths })];
  if (l.sqft) parts.push(fmtArea(l.sqft, ' / '));
  if (l.lotAcres) parts.push(t('{n} ac', { n: l.lotAcres }));
  return parts.join(' · ');
}
