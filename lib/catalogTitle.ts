import type { Filters } from './filters';
import { makeT, type Lang } from './i18n';

/**
 * Заголовок добірки каталогу зі складу фільтрів. Окремо від catalogSeo, бо той ходить у базу,
 * а заголовок потрібен і в браузері — це H1 сторінки каталогу.
 */
const NOUN: Record<string, string> = {
  house: 'houses',
  condo: 'condos',
  land: 'land',
  commercial: 'commercial property',
};

/** Район, місто чи острів добірки; без них — уся країна. */
export const catalogPlace = (f: Filters) => (f.neighborhoods.length === 1 ? f.neighborhoods[0] : f.island || 'Honduras');

/** «3-bed houses for sale in West Bay» — зі складу фільтрів, перекладено шаблонами t(). */
export function catalogTitle(f: Filters, lang: Lang) {
  const t = makeT(lang);
  let what = t(NOUN[f.type] ?? 'homes, condos & land');
  const beds = f.beds.length === 1 && f.type !== 'land' ? f.beds[0] : '';
  if (beds) what = t(beds === '4' ? '{n}+ bed {what}' : beds === '1' ? '1-bed {what}' : '{n}-bed {what}', { n: beds, what });
  if (f.oceanfront) what = t('oceanfront {what}', { what });
  if (f.ready && f.type === 'land') what = t('ready-to-build {what}', { what });
  if (f.deal === 'rent') what = t('{what} for rent', { what });
  else if (f.deal === 'sale') what = t('{what} for sale', { what });
  const s = t('{what} in {place}', { what, place: catalogPlace(f) });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

