import type { Metadata } from 'next';
import { cache } from 'react';
import { PAGE_SIZE, searchListings } from './db';
import { EMPTY_FILTERS, fromParams, toListingQuery, toQuery, type Filters } from './filters';
import { makeT, type Lang } from './i18n';
import { localePath } from './i18n/paths';
import { fmtNumber } from './format';
import { OG_LOCALE, localized } from './seoMeta';
import { SITE_NAME } from './site';

/**
 * Каталог /listings для пошуковиків: заголовок і опис зі складу фільтрів, canonical,
 * noindex для малоцінних комбінацій і сторінки ?page=N. Сторінка й generateMetadata
 * беруть дані з одного cache — база питається один раз на запит.
 */
type SP = Record<string, string | string[] | undefined>;

/** Фільтри з адреси. Без явного вибору показуємо продаж (крім портфеля агенції чи ріелтора). */
export function catalogFilters(sp: SP): Filters {
  const filters = fromParams(sp);
  if (!filters.deal && !filters.agentId && !filters.agencyId) filters.deal = 'sale';
  return filters;
}

/** ?page=N → номер сторінки з 1; криве значення — перша. */
export function catalogPage(sp: SP): number {
  const v = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 1 ? Math.min(n, 1000) : 1;
}

/** Одна сторінка результатів; qs — рядок фільтрів (toQuery), page — з 1. */
export const loadCatalogPage = cache(async (qs: string, page: number) =>
  searchListings(toListingQuery(new URLSearchParams(qs)), page - 1, PAGE_SIZE));

/** Фільтри, з яких складається індексована сторінка: розділ, тип, район, спальні, біля моря, «готова» земля. */
function coreOf(f: Filters): Filters {
  return {
    ...EMPTY_FILTERS,
    deal: f.deal, type: f.type, neighborhoods: f.neighborhoods, beds: f.beds,
    oceanfront: f.oceanfront, ready: f.ready && f.type === 'land',
  };
}

/** Адреса каталогу з фільтрами в усталеному порядку; page=1 не пишемо. */
export function catalogUrl(f: Filters, page = 1) {
  const p = new URLSearchParams(toQuery(f));
  if (page > 1) p.set('page', String(page));
  const s = p.toString();
  return `/listings${s ? `?${s}` : ''}`;
}

/**
 * Чи варто індексувати комбінацію. Ні — коли є сортування, межі карти, пошуковий текст,
 * ціни/площі й інші вузькі фільтри, кілька районів чи кількостей спалень, портфель агенції
 * (у неї своя сторінка) або більше трьох фасетів разом.
 */
export function isIndexable(f: Filters) {
  const core = coreOf(f);
  if (toQuery(f) !== toQuery(core)) return false;
  if (f.deal !== 'sale' && f.deal !== 'rent') return false;
  if (f.neighborhoods.length > 1 || f.beds.length > 1) return false;
  const facets = [f.type, f.neighborhoods.length, f.beds.length, f.oceanfront, core.ready].filter(Boolean).length;
  return facets <= 3;
}

const NOUN: Record<string, string> = {
  house: 'houses',
  condo: 'condos',
  land: 'land',
  commercial: 'commercial property',
};

/** «3-bed houses for sale in West Bay» — зі складу фільтрів, перекладено шаблонами t(). */
export function catalogTitle(f: Filters, lang: Lang) {
  const t = makeT(lang);
  let what = t(NOUN[f.type] ?? 'homes, condos & land');
  const beds = f.beds.length === 1 && f.type !== 'land' ? f.beds[0] : '';
  if (beds) what = t(beds === '4' ? '{n}+ bed {what}' : '{n}-bed {what}', { n: beds, what });
  if (f.oceanfront) what = t('oceanfront {what}', { what });
  if (f.ready && f.type === 'land') what = t('ready-to-build {what}', { what });
  if (f.deal === 'rent') what = t('{what} for rent', { what });
  else if (f.deal === 'sale') what = t('{what} for sale', { what });
  const place = f.neighborhoods.length === 1 ? f.neighborhoods[0] : 'Roatán';
  const s = t('{what} in {place}', { what, place });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Метадані каталогу: заголовок з фільтрів, canonical на нормалізовану адресу, noindex для зайвого. */
export async function catalogMetadata(sp: SP, lang: Lang): Promise<Metadata> {
  const t = makeT(lang);
  const f = catalogFilters(sp);
  const page = catalogPage(sp);
  const { total } = await loadCatalogPage(toQuery(f), page);
  const head = catalogTitle(f, lang);
  const title = `${head}${page > 1 ? t(' — page {n}', { n: page }) : ''}`;
  const description = t('{what}: {n} listings with photos, prices and a map. Contact island agencies directly on WhatsApp.', {
    what: head, n: fmtNumber(total),
  });

  if (!isIndexable(f) || total === 0) {
    return {
      title: `${title} | ${SITE_NAME}`,
      description,
      robots: { index: false, follow: true },
      openGraph: { title, description, siteName: SITE_NAME, type: 'website', locale: OG_LOCALE[lang] },
    };
  }
  return localized(catalogUrl(coreOf(f), page), {
    title: `${title} | ${SITE_NAME}`,
    description,
    openGraph: { title, description },
  }, lang);
}

/** Сусідні сторінки для <link rel="prev/next"> у head. */
export function pageLinks(f: Filters, page: number, total: number, lang: Lang) {
  const last = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return {
    prev: page > 1 ? localePath(lang, catalogUrl(f, page - 1)) : null,
    next: page < last ? localePath(lang, catalogUrl(f, page + 1)) : null,
  };
}
