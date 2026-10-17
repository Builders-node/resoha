import type { Metadata } from 'next';
import type { Lang } from './i18n';
import { getLang } from './i18n/server';
import { langAlternates, localePath } from './i18n/paths';
import { SITE_NAME } from './site';
import { ES_META } from './i18n/es/meta';

/**
 * meta description до 160 знаків: довше Google обрізає посеред слова. Ріжемо по межі
 * речення, якщо воно не надто коротке, інакше по межі слова з «…».
 */
export function metaDescription(text: string, max = 160): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const dot = cut.lastIndexOf('. ');
  if (dot >= 100) return cut.slice(0, dot + 1);
  const sp = cut.lastIndexOf(' ', max - 1);
  return `${cut.slice(0, sp > 0 ? sp : max - 1).replace(/[\s,;:—–-]+$/, '')}…`;
}

/** og:locale для кожної мови; es_LA — іспанська Латинської Америки у словнику Open Graph. */
export const OG_LOCALE: Record<Lang, string> = { en: 'en_US', es: 'es_LA' };

/**
 * Метадані публічної сторінки з мовними версіями: canonical на адресу поточної мови,
 * hreflang en / es / x-default і og:locale. path — англійська адреса (можна з ?query).
 */
export async function localized(path: string, meta: Metadata = {}, lang?: Lang): Promise<Metadata> {
  const l = lang ?? await getLang();
  const url = localePath(l, path);
  if (l === 'es' && ES_META[path]) meta = withText(meta, ES_META[path]);
  return {
    ...meta,
    alternates: { ...meta.alternates, canonical: url, languages: langAlternates(path) },
    openGraph: {
      siteName: SITE_NAME,
      type: 'website',
      ...(meta.openGraph as object | undefined),
      url,
      locale: OG_LOCALE[l],
      alternateLocale: [OG_LOCALE[l === 'es' ? 'en' : 'es']],
    } as Metadata['openGraph'],
  };
}

/**
 * Підставляє вичитаний title / description у всі місця, де пошуковики й соцмережі його читають:
 * <title>, meta description і og:* (twitter:* Next бере з og). У og title — без « | Hogarli».
 */
function withText(meta: Metadata, o: { title?: string; description?: string }): Metadata {
  const { title, description } = o;
  const short = title?.replace(/\s*\|\s*[^|]+$/, '');
  return {
    ...meta,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    openGraph: { ...(meta.openGraph as object | undefined), ...(short ? { title: short } : {}), ...(description ? { description } : {}) },
  } as Metadata;
}
