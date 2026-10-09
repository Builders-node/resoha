import type { Metadata } from 'next';
import Link from 'next/link';
import Crumbs from '@/components/Crumbs';
import JsonLd from '@/components/JsonLd';
import { GUIDES } from '@/lib/content/guides';
import { fmtDate } from '@/lib/format';
import { makeT } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { breadcrumbLd, graph } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: `Roatán property buying guides for foreigners | ${SITE_NAME}`,
  description: 'Plain-language guides to buying property on Roatán: foreign ownership and the 3,000 m² rule, the buying process, closing costs, title checks, rental income and the best areas.',
  alternates: { canonical: '/guides' },
};

export default async function GuidesPage() {
  const lang = await getLang();
  const t = makeT(lang);
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }];
  return (
    <div className="wrap page">
      <JsonLd data={graph(breadcrumbLd(crumbs), {
        '@type': 'CollectionPage',
        name: 'Roatán property buying guides',
        url: `${SITE_URL}/guides`,
        hasPart: GUIDES.map((g) => ({ '@type': 'Article', headline: g.title, url: `${SITE_URL}/guides/${g.slug}` })),
      })} />
      <h1>{t('Buying property on Roatán: guides')}</h1>
      <p className="page__lead">
        {t('Straight answers to the questions buyers ask before they fly: who can own land, what it costs, how to check a title and where to live. Every figure links to its source.')}
      </p>
      <div className="guide-list guide-list--wide">
        {GUIDES.map((g) => (
          <Link key={g.slug} className="guide-card" href={`/guides/${g.slug}`}>
            <b>{t(g.title)}</b>
            <span className="small muted">{t(g.description)}</span>
            <span className="tiny muted">{t('Updated')} {fmtDate(g.updated, lang)}</span>
          </Link>
        ))}
      </div>
      <Crumbs items={crumbs.map((c) => ({ ...c, name: t(c.name) }))} />
    </div>
  );
}
