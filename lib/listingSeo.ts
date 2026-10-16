import type { Listing } from './types';
import { makeT, type Lang } from './i18n';
import { EMPTY_FILTERS, type Filters } from './filters';
import { catalogTitle, catalogUrl } from './catalogSeo';
import { DEAL_LABELS, fmtNumber, fmtPrice, sqftToM2 } from './format';
import { areaForNeighborhood } from './content/areas';
import { regionByName, regionOfArea } from './regions';

/**
 * Сторінка оголошення для пошуковиків: заголовок і опис з фактів, а не лише з тексту ріелтора,
 * «хлібні крихти» через індексовані сторінки каталогу і перелинковка на них. Шукають
 * «2 bedroom condo for sale West Bay Roatan», а ріелтор пише «Ocean View Paradise» — тому
 * тип, угоду, район і місто додаємо самі, і лише ті, яких у назві ще немає.
 */
type L = Pick<Listing, 'deal' | 'type' | 'title' | 'island' | 'neighborhood' | 'price' | 'beds' | 'baths' | 'sqft' | 'lotAcres' | 'year' | 'hoa' | 'oceanfront' | 'status' | 'development' | 'unitNo'>;

/** Місто чи острів оголошення: з колонки island, а якщо там порожньо — з району. */
export const listingCity = (l: Pick<Listing, 'island' | 'neighborhood'>) =>
  regionByName(l.island)?.name ?? regionOfArea(l.neighborhood)?.name ?? l.island;

/** Однина окремо від словника: там «land» уже перекладено множиною для каталогу. */
const SINGULAR: Record<Lang, Record<string, string>> = {
  en: { house: 'house', condo: 'condo', land: 'land', commercial: 'commercial property' },
  es: { house: 'casa', condo: 'condominio', land: 'terreno', commercial: 'local comercial' },
};

/** «2-bed condo for sale in West Bay, Roatán» — те, що люди вводять у пошук. */
export function listingHeadline(l: L, lang: Lang) {
  const t = makeT(lang);
  let what = SINGULAR[lang][l.type] ?? t('property');
  if (l.type !== 'land' && l.type !== 'commercial') {
    what = l.beds === 1 ? t('1-bed {what}', { what })
      : l.beds > 0 ? t('{n}-bed {what}', { n: l.beds, what }) : t('studio {what}', { what });
  }
  if (l.oceanfront) what = t('oceanfront {what}', { what });
  what = l.deal === 'rent' ? t('{what} for rent', { what }) : t('{what} for sale', { what });
  const city = listingCity(l);
  const place = l.neighborhood && l.neighborhood !== city ? `${l.neighborhood}, ${city}` : city;
  const s = t('{what} in {place}', { what, place });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** <title>: назва ріелтора + те, чого в ній бракує (тип, угода, місце), + ціна. */
export function listingMetaTitle(l: L, lang: Lang) {
  const title = l.title.trim();
  const price = fmtPrice(l.price, l.deal, lang);
  const has = (s: string) => Boolean(s) && fold(title).includes(fold(s));
  // назва вже каже, що це за угода і де (район і місто), — досить ціни; інакше додаємо «тип · угода · місце»
  const dealWords = l.deal === 'rent' ? ['rent', 'alquiler', 'renta'] : ['sale', 'venta'];
  if (has(l.neighborhood) && has(listingCity(l)) && dealWords.some(has)) return `${title} — ${price}`;
  return `${title} — ${listingHeadline(l, lang)}, ${price}`;
}

/**
 * Довідка про обʼєкт кількома реченнями з полів оголошення. Іде в meta description і
 * видимим абзацом на сторінці: її однаково читають люди, пошуковики й AI-асистенти,
 * а в оголошень з коротким описом вона прибирає «тонкий контент».
 */
export function listingSummary(l: L, lang: Lang) {
  const t = makeT(lang);
  const parts: string[] = [];
  const price = fmtPrice(l.price, l.deal, lang);
  parts.push(t('{headline}, listed at {price}.', { headline: listingHeadline(l, lang), price }));
  if (l.type !== 'land') {
    const size: string[] = [];
    if (l.beds > 0) size.push(t(l.beds === 1 ? '1 bedroom' : '{n} bedrooms', { n: l.beds }));
    if (l.baths > 0) size.push(t(l.baths === 1 ? '1 bathroom' : '{n} bathrooms', { n: l.baths }));
    if (l.sqft > 0) size.push(`${fmtNumber(sqftToM2(l.sqft))} m² (${fmtNumber(l.sqft)} ft²)`);
    if (size.length) parts.push(`${size.join(', ')}.`);
    if (l.deal === 'sale' && l.sqft > 0 && l.price > 0) {
      parts.push(t('That is about {ppsf} per ft².', { ppsf: `$${fmtNumber(Math.round(l.price / l.sqft))}` }));
    }
  }
  if (l.lotAcres > 0) parts.push(t('Lot of {n} acres.', { n: l.lotAcres }));
  if (l.year > 0) parts.push(t('Built in {year}.', { year: l.year }));
  if (l.hoa > 0) parts.push(t('HOA {hoa} a month.', { hoa: `$${fmtNumber(l.hoa)}` }));
  if (l.development) {
    parts.push(l.unitNo
      ? t('Unit {n} in {name}.', { n: l.unitNo, name: l.development.name })
      : t('Part of {name}.', { name: l.development.name }));
  }
  if (l.status === 'reserved') parts.push(t('Currently reserved.'));
  return parts.join(' ');
}

/** meta description: довідка, потім початок опису ріелтора — до ~160 знаків, по межі слова. */
export function listingMetaDescription(l: L & { text: string; textEs?: string }, lang: Lang) {
  const body = (lang === 'es' && l.textEs?.trim() ? l.textEs : l.text).replace(/\s+/g, ' ').trim();
  const s = `${listingSummary(l, lang)} ${body}`.trim();
  if (s.length <= 160) return s;
  const cut = s.slice(0, 157);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 120))}…`;
}

const filters = (patch: Partial<Filters>): Filters => ({ ...EMPTY_FILTERS, ...patch });
const CATALOG_TYPES = new Set(['house', 'condo', 'land', 'commercial']);

/**
 * Хлібні крихти через сторінки каталогу, які самі індексуються й стоять у карті сайту:
 * Головна › Продаж › Роатан › Кондо на продаж у West Bay › оголошення.
 */
export function listingCrumbs(l: L & { id: string }, lang: Lang) {
  const t = makeT(lang);
  const city = listingCity(l);
  const type = CATALOG_TYPES.has(l.type) ? l.type : '';
  const local = filters({ deal: l.deal, type, neighborhoods: l.neighborhood ? [l.neighborhood] : [] });
  return [
    { name: t('Home'), path: '/' },
    { name: t(DEAL_LABELS[l.deal]), path: catalogUrl(filters({ deal: l.deal })) },
    ...(city ? [{ name: city, path: catalogUrl(filters({ deal: l.deal, island: city })) }] : []),
    ...(l.neighborhood && l.neighborhood !== city ? [{ name: catalogTitle(local, lang), path: catalogUrl(local) }] : []),
    { name: l.title, path: `/listings/${l.id}` },
  ];
}

/**
 * «Більше схожого» текстовими посиланнями: той самий тип у районі й у місті, усе в районі,
 * спальні в місті, гід по району. Це головний шлях, яким вага сторінок оголошень
 * перетікає на посадкові сторінки каталогу і назад.
 */
export function listingExploreLinks(l: L, lang: Lang) {
  const t = makeT(lang);
  const city = listingCity(l);
  const type = CATALOG_TYPES.has(l.type) ? l.type : '';
  const hood = l.neighborhood && l.neighborhood !== city ? [l.neighborhood] : [];
  const combos: Filters[] = [
    ...(hood.length && type ? [filters({ deal: l.deal, type, neighborhoods: hood })] : []),
    ...(hood.length ? [filters({ deal: l.deal, neighborhoods: hood })] : []),
    ...(type && city ? [filters({ deal: l.deal, type, island: city })] : []),
    ...(type && type !== 'land' && type !== 'commercial' && l.beds > 0 && city
      ? [filters({ deal: l.deal, type, island: city, beds: [String(Math.min(l.beds, 4))] })] : []),
    ...(l.deal === 'sale' && l.oceanfront && city ? [filters({ deal: 'sale', island: city, oceanfront: true })] : []),
    ...(city ? [filters({ deal: l.deal === 'sale' ? 'rent' : 'sale', island: city })] : []),
  ];
  const seen = new Set<string>();
  const links = combos
    .map((f) => ({ name: catalogTitle(f, lang), path: catalogUrl(f) }))
    .filter((x) => !seen.has(x.path) && seen.add(x.path));
  const area = areaForNeighborhood(l.neighborhood);
  if (area) links.push({ name: t('{area} area guide: prices and what it is like to live there', { area: area.name }), path: `/areas/${area.slug}` });
  return links;
}
