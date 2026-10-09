import type { Metadata } from 'next';
import type { Lang } from './i18n';
import { getLang } from './i18n/server';
import { langAlternates, localePath } from './i18n/paths';
import { SITE_NAME } from './site';

/** og:locale для кожної мови; es_LA — іспанська Латинської Америки у словнику Open Graph. */
export const OG_LOCALE: Record<Lang, string> = { en: 'en_US', es: 'es_LA' };

/**
 * Метадані публічної сторінки з мовними версіями: canonical на адресу поточної мови,
 * hreflang en / es / x-default і og:locale. path — англійська адреса (можна з ?query).
 */
export async function localized(path: string, meta: Metadata = {}, lang?: Lang): Promise<Metadata> {
  const l = lang ?? await getLang();
  const url = localePath(l, path);
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
