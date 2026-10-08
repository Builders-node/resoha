import type { Metadata } from 'next';
import Link from 'next/link';
import Crumbs from '@/components/Crumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import { AREAS } from '@/lib/content/areas';
import { queryListings } from '@/lib/db';
import { nListings } from '@/lib/format';
import { makeT } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { breadcrumbLd, graph } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: `Roatán neighbourhoods: where to buy property | ${SITE_NAME}`,
  description: 'Compare Roatán’s areas from West Bay to Camp Bay: typical prices, who each area suits and the homes, condos and land listed there now.',
  alternates: { canonical: '/areas' },
};

export default async function AreasPage() {
  const lang = await getLang();
  const t = makeT(lang);
  const all = await queryListings();
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Areas', path: '/areas' }];
  return (
    <div className="wrap page">
      <JsonLd data={graph(breadcrumbLd(crumbs), {
        '@type': 'ItemList',
        name: 'Areas of Roatán',
        itemListElement: AREAS.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/areas/${a.slug}`, name: a.name })),
      })} />
      <h1>{t('Areas of Roatán: where to buy')}</h1>
      <p className="page__lead">
        {t('Roatán is about 77 km (48 miles) long and less than 8 km wide, and prices fall from the beaches of the west to the quiet, land-rich east. Pick an area to see typical prices, what it is like to live there and what is listed now.')}
      </p>
      <div className="grid grid--3">
        {AREAS.map((a) => {
          const n = all.filter((l) => a.neighborhoods.includes(l.neighborhood)).length;
          return (
            <Link key={a.slug} className="area-card" href={`/areas/${a.slug}`}>
              <span className="area-card__top">
                <b>{t(a.name)}</b>
                <Icon name="arrowRight" size={18} />
              </span>
              <span className="area-card__price">{a.priceRange ?? t('Prices below the west')}</span>
              <span className="small muted">{t(a.bestFor)}</span>
              <span className="tiny muted">{t('{n} on Resoha', { n: nListings(n, lang) })}</span>
            </Link>
          );
        })}
      </div>
      <p className="small muted" style={{ marginTop: 24 }}>
        {t('Not sure yet? Read')} <Link className="link-accent" href="/guides/best-areas-to-live-in-roatan">{t('the best areas to live in Roatán, compared')}</Link>.
      </p>
      <Crumbs items={crumbs.map((c) => ({ ...c, name: t(c.name) }))} />
    </div>
  );
}
