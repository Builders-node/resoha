import type { Metadata } from 'next';
import { localized } from '@/lib/seoMeta';
import Link from 'next/link';
import Crumbs from '@/components/Crumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import { AREAS, areaRegion } from '@/lib/content/areas';
import { REGIONS } from '@/lib/regions';
import { queryListings } from '@/lib/db';
import { nListings } from '@/lib/format';
import { makeT } from '@/lib/i18n';
import { getLang, getLp, getT } from '@/lib/i18n/server';
import { breadcrumbLd, graph } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return localized('/areas', {
    title: `${t('Areas of Roatán, San Pedro Sula and Tegucigalpa: where to buy')} | ${SITE_NAME}`,
    description: t('Compare the areas of Roatán, San Pedro Sula and Tegucigalpa: typical prices, who each area suits and the homes, condos and land listed there now.'),
  });
}

const LEAD: Record<string, string> = {
  'Roatán': 'Roatán is about 77 km (48 miles) long and less than 8 km wide, and prices fall from the beaches of the west to the quiet, land-rich east. Pick an area to see typical prices, what it is like to live there and what is listed now.',
  'San Pedro Sula': 'The business capital of Honduras, in the Sula Valley: gated colonias, apartment towers and commercial property near the busiest airport in the country.',
  'Tegucigalpa': 'The capital, in a cool mountain valley: apartment towers in the south-east colonias, family homes in the hills and colonial towns on the road east.',
};

export default async function AreasPage() {
  const lp = await getLp();
  const lang = await getLang();
  const t = makeT(lang);
  const all = await queryListings();
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Areas', path: '/areas' }];
  return (
    <div className="wrap page">
      <JsonLd data={graph(breadcrumbLd(crumbs), {
        '@type': 'ItemList',
        name: 'Areas of Roatán, San Pedro Sula and Tegucigalpa',
        itemListElement: AREAS.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/areas/${a.slug}`, name: a.name })),
      })} />
      <h1>{t('Areas of Roatán, San Pedro Sula and Tegucigalpa: where to buy')}</h1>
      {REGIONS.map((r) => {
        const areas = AREAS.filter((a) => areaRegion(a) === r.name);
        return (
          <section key={r.slug} className="section" style={{ paddingTop: 8 }}>
            <h2 style={{ fontSize: 'var(--fs-h2)', marginBottom: 8 }}>{r.name}</h2>
            {LEAD[r.name] && <p className="page__lead">{t(LEAD[r.name])}</p>}
            <div className="grid grid--3">
              {areas.map((a) => {
                const n = all.filter((l) => a.neighborhoods.includes(l.neighborhood)).length;
                return (
                  <Link key={a.slug} className="area-card" href={lp(`/areas/${a.slug}`)}>
                    <span className="area-card__top">
                      <b>{t(a.name)}</b>
                      <Icon name="arrowRight" size={18} />
                    </span>
                    <span className="area-card__price">{a.priceRange ?? t(a.priceNote ?? 'Prices below the west')}</span>
                    <span className="small muted">{t(a.bestFor)}</span>
                    <span className="tiny muted">{t('{n} on Hogarli', { n: nListings(n, lang) })}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="small muted" style={{ marginTop: 24 }}>
        {t('Not sure yet? Read')} <Link className="link-accent" href={lp('/guides/best-areas-to-live-in-roatan')}>{t('the best areas to live in Roatán, compared')}</Link>.
      </p>
      <Crumbs items={crumbs.map((c) => ({ ...c, name: t(c.name) }))} />
    </div>
  );
}
