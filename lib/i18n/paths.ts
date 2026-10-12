import type { Lang } from './index';

/**
 * Іспанські адреси для пошуковиків: /es/... — ті самі сторінки з примусовою мовою es.
 * Proxy переписує /es/* на звичайний маршрут і передає мову заголовком LANG_HEADER,
 * тож окремих сторінок під /es у app/ немає. Кабінети й службові сторінки живуть без префікса.
 */
export const LANG_HEADER = 'x-resoha-lang';
export const ES_PREFIX = '/es';

const PUBLIC: RegExp[] = [
  /^\/$/,
  /^\/(listings|developments|developers|areas|guides|agents|agency)(\/|$)/,
  /^\/(market|faq|land-passport|about|for-agents)$/,
];

/** Чи має сторінка іспанську адресу (лише шлях, без ?query). */
export const isLocalizedPath = (path: string) => PUBLIC.some((re) => re.test(path));

/** /es/listings → { lang: 'es', path: '/listings' }; /listings → { lang: null, path: '/listings' } */
export function stripLang(pathname: string): { lang: Lang | null; path: string } {
  if (pathname === ES_PREFIX || pathname.startsWith(`${ES_PREFIX}/`)) {
    return { lang: 'es', path: pathname.slice(ES_PREFIX.length) || '/' };
  }
  return { lang: null, path: pathname };
}

/**
 * Посилання всередині сайту з урахуванням мови: для es публічні сторінки отримують /es.
 * Зовнішні адреси, якорі й кабінети повертаються як є.
 */
export function localePath(lang: Lang, href: string): string {
  if (lang !== 'es' || !href.startsWith('/') || href.startsWith('//')) return href;
  const cut = href.search(/[?#]/);
  const path = cut < 0 ? href : href.slice(0, cut);
  const rest = cut < 0 ? '' : href.slice(cut);
  if (stripLang(path).lang || !isLocalizedPath(path)) return href;
  return `${ES_PREFIX}${path === '/' ? '' : path}${rest}`;
}

/** Мовні версії сторінки для hreflang: en (вона ж x-default) і es. */
export function langAlternates(href: string) {
  const es = localePath('es', href);
  return { en: href, es, 'x-default': href };
}
