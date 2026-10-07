import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Crumbs from '@/components/Crumbs';
import Faq from '@/components/Faq';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import ListingCard from '@/components/ListingCard';
import Rich from '@/components/Rich';
import SourceList from '@/components/SourceList';
import { AREAS, areaBySlug } from '@/lib/content/areas';
import { MARKET_UPDATED } from '@/lib/content/market';
import { queryListings } from '@/lib/db';
import { AREA_CENTRES, fmtDate, fmtUsd, nListings } from '@/lib/format';
import { makeT } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { breadcrumbLd, faqLd, graph } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const dynamicParams = false;
export const generateStaticParams = () => AREAS.map((a) => ({ slug: a.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = areaBySlug((await params).slug);
  if (!a) return {};
  const title = `${a.name}, Roatán: homes, condos & land for sale`;
  const description = `${a.summary}${a.priceRange ? ` Typical prices: ${a.priceRange}.` : ''}`.slice(0, 300);
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: `/areas/${a.slug}` },
    openGraph: { title, description, url: `/areas/${a.slug}`, type: 'website' },
  };
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
  const a = areaBySlug((await params).slug);
  if (!a) notFound();
  const lang = await getLang();
  const t = makeT(lang);
  const name = t(a.name);

  const listings = await queryListings({ neighborhoods: a.neighborhoods });
  const sale = listings.filter((l) => l.deal === 'sale');
  const from = sale.length ? Math.min(...sale.map((l) => l.price)) : null;
  const centre = AREA_CENTRES[a.neighborhoods[0]];
  const filterHref = `/listings?neighborhoods=${encodeURIComponent(a.neighborhoods.join(','))}`;

  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Areas', path: '/areas' }, { name: a.name, path: `/areas/${a.slug}` }];
  const place = {
    '@type': 'Place',
    '@id': `${SITE_URL}/areas/${a.slug}#place`,
    name: `${a.name}, Roatán`,
    description: a.summary,
    containedInPlace: { '@type': 'Place', name: 'Roatán, Islas de la Bahía, Honduras' },
    ...(centre ? { geo: { '@type': 'GeoCoordinates', latitude: centre[0], longitude: centre[1] } } : {}),
  };
  const list = {
    '@type': 'ItemList',
    name: `Property listed in ${a.name}, Roatán`,
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 12).map((l, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/listings/${l.id}`, name: l.title })),
  };
  const others = AREAS.filter((x) => x.slug !== a.slug);

  return (
    <div className="wrap page">
      <JsonLd data={graph(place, list, faqLd(a.faq), breadcrumbLd(crumbs))} />

      <h1>{t('{area}, Roatán: property and area guide', { area: name })}</h1>
      <section className="answer" aria-label={t('Summary')}>
        <span className="answer__k">{t('In short')}</span>
        <p>{a.summary}</p>
      </section>

      <div className="stats area-stats">
        <div className="stat">
          <span className="muted small">{t('Typical prices')}</span>
          <b>{a.priceRange ?? t('Too few sales')}</b>
          {a.priceSource && <span className="tiny muted">{t('Source:')} {a.priceSource.name}</span>}
        </div>
        <div className="stat">
          <span className="muted small">{t('On Resoha now')}</span>
          <b>{nListings(listings.length, lang)}</b>
          <span className="tiny muted">{from !== null ? t('For sale from {price}', { price: fmtUsd(from) }) : t('Live count from our catalogue')}</span>
        </div>
        <div className="stat stat--wide">
          <span className="muted small">{t('Best for')}</span>
          <b className="stat__text">{t(a.bestFor)}</b>
        </div>
      </div>

      <div className="page__cols">
        <div className="prose prose--flush">
          <h2>{t('About {area}', { area: name })}</h2>
          {a.intro.map((p) => <p key={p}><Rich text={p} /></p>)}

          <h2>{t('Why buyers choose {area}', { area: name })}</h2>
          <ul>{a.highlights.map((h) => <li key={h}><Rich text={h} /></li>)}</ul>

          <h2>{t('What to check before buying')}</h2>
          <ul>{a.considerations.map((h) => <li key={h}><Rich text={h} /></li>)}</ul>
        </div>

        <aside className="panel page__aside">
          <h3>{t('Search {area}', { area: name })}</h3>
          <p className="small muted" style={{ margin: '6px 0 14px' }}>
            {t('Every listing on Resoha links back to the island agency that holds it.')}
          </p>
          <div className="page__aside-btns">
            <Link className="btn btn--orange btn--block" href={`${filterHref}&deal=sale`}>{t('Homes for sale')}</Link>
            <Link className="btn btn--ghost btn--block" href={`${filterHref}&deal=rent`}>{t('Rentals')}</Link>
            <Link className="btn btn--ghost btn--block" href={`${filterHref}&type=land`}>{t('Land & lots')}</Link>
          </div>
          <p className="tiny muted" style={{ marginTop: 14 }}>
            {t('Read next:')} <Link className="link-accent" href="/guides/best-areas-to-live-in-roatan">{t('all areas compared')}</Link>
          </p>
        </aside>
      </div>

      <section className="section">
        <div className="section__head">
          <h2>{t('Listed in {area}', { area: name })}</h2>
          {listings.length > 0 && <Link className="btn btn--primary" href={filterHref}>{t('See all on the map')} <Icon name="arrowRight" size={18} /></Link>}
        </div>
        {listings.length > 0 ? (
          <div className="grid grid--4">
            {listings.slice(0, 8).map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        ) : (
          <div className="panel empty">
            <p>{t('No listings in {area} yet. We are adding island agencies every week.', { area: name })}</p>
            <Link className="btn btn--primary" href="/listings?deal=sale">{t('Browse the whole island')}</Link>
          </div>
        )}
      </section>

      <section className="prose prose--flush">
        <h2>{t('{area}: frequently asked questions', { area: name })}</h2>
        <Faq items={a.faq} open={a.faq.length} />
        {a.priceSource && (
          <>
            <h2>{t('Sources')}</h2>
            <SourceList sources={[a.priceSource]} />
          </>
        )}
        <p className="tiny muted">{t('Area information checked {date}. Listing counts update live.', { date: fmtDate(MARKET_UPDATED, lang) })}</p>
      </section>

      <section className="section">
        <h2 style={{ fontSize: 22, marginBottom: 14 }}>{t('Other areas of Roatán')}</h2>
        <div className="chip-row">
          {others.map((o) => <Link key={o.slug} className="chip-btn" href={`/areas/${o.slug}`}>{t(o.name)}</Link>)}
        </div>
      </section>
      <Crumbs items={crumbs.map((c) => ({ ...c, name: t(c.name) }))} />
    </div>
  );
}
