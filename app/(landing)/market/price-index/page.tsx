import type { Metadata } from 'next';
import Link from 'next/link';
import CopyBox from '@/components/CopyBox';
import Crumbs from '@/components/Crumbs';
import JsonLd from '@/components/JsonLd';
import { USD_MONEY } from '@/lib/currency';
import { priceStatsRows } from '@/lib/db';
import { fmtNumber } from '@/lib/format';
import { intlLocale, makeT, type T } from '@/lib/i18n';
import { getLang, getLp, getT } from '@/lib/i18n/server';
import { buildPriceIndex, type CityIndex, type IndexValue } from '@/lib/priceIndex';
import { yearAgo } from '@/lib/priceStats';
import { breadcrumbLd, graph } from '@/lib/seo';
import { localized } from '@/lib/seoMeta';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const PATH = '/market/price-index';
const usd = USD_MONEY.amount;
const monthLabel = (iso: string, lang: 'en' | 'es') =>
  new Date(iso).toLocaleDateString(intlLocale(lang), { month: 'long', year: 'numeric', timeZone: 'UTC' });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  const lang = (await getLang());
  const month = monthLabel(new Date().toISOString(), lang);
  return localized(PATH, {
    title: `${t('Hogarli Price Index, {month}: property prices in Honduras', { month })} | ${SITE_NAME}`,
    description: t('Monthly median prices per m², rents and rental yields in Roatán, San Pedro Sula and Tegucigalpa, calculated from open listings on Hogarli. Free to cite.'),
  });
}

function Change({ v, t }: { v: IndexValue | null; t: T }) {
  if (!v || v.change === null) return <span className="muted tiny">{t('no history yet')}</span>;
  return (
    <span className={`pstat-badge ${v.change < 0 ? 'is-down' : 'is-up'}`}>
      {v.change > 0 ? '+' : ''}{v.change.toFixed(1).replace('-', '−')}%
    </span>
  );
}

/** Головні висновки місяця — готові речення для статті */
function findings(cities: CityIndex[], t: T): string[] {
  const out: string[] = [];
  const priced = cities.filter((c) => c.perM2);
  if (priced.length >= 2) {
    const [hi, lo] = [...priced].sort((a, b) => b.perM2!.value - a.perM2!.value).filter((_, i, a) => i === 0 || i === a.length - 1);
    out.push(t('A square metre in {hi} costs a median {hiv}, against {lov} in {lo}.', {
      hi: hi.name, hiv: usd(hi.perM2!.value), lo: lo.name, lov: usd(lo.perM2!.value),
    }));
  }
  for (const c of priced) {
    if (c.perM2!.change !== null) {
      out.push(t('In {city}, the median asking price per m² changed {pct}% in a year.', {
        city: c.name, pct: `${c.perM2!.change > 0 ? '+' : ''}${c.perM2!.change.toFixed(1)}`,
      }));
    }
  }
  const yields = cities.flatMap((c) => c.beds.filter((b) => b.yieldPct !== null).map((b) => ({ c, b })))
    .sort((a, b) => b.b.yieldPct! - a.b.yieldPct!);
  if (yields.length) {
    const { c, b } = yields[0];
    out.push(b.beds === 0
      ? t('The best gross rental yield is in studios in {city}: {pct}% a year before costs.', { city: c.name, pct: b.yieldPct!.toFixed(1) })
      : t('The best gross rental yield is in {beds}-bedroom homes in {city}: {pct}% a year before costs.', {
        beds: b.beds === 3 ? '3+' : b.beds, city: c.name, pct: b.yieldPct!.toFixed(1),
      }));
  }
  for (const c of cities) {
    if (c.areas.length >= 2) {
      out.push(t('The most expensive area of {city} is {area} at {v} per m².', {
        city: c.name, area: c.areas[0].name, v: usd(c.areas[0].perM2.value),
      }));
    }
  }
  return out;
}

export default async function PriceIndexPage() {
  const lp = await getLp();
  const lang = await getLang();
  const t = makeT(lang);
  const rows = await priceStatsRows(yearAgo()).catch(() => []);
  const ix = buildPriceIndex(rows);
  const month = monthLabel(ix.month, lang);
  const facts = findings(ix.cities, t);
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Market report', path: '/market' }, { name: 'Price index', path: PATH }];
  const cite = t('Source: Hogarli Price Index, {month} ({url}).', { month, url: `${SITE_URL.replace(/^https?:\/\//, '')}${PATH}` });
  const press = [t('Hogarli Price Index, {month}', { month }), '', ...facts.map((f) => `• ${f}`), '', cite].join('\n');

  return (
    <div className="wrap page">
      <JsonLd data={graph(breadcrumbLd(crumbs), {
        '@type': 'Dataset',
        name: `Hogarli Price Index, ${monthLabel(ix.month, 'en')}`,
        description: 'Monthly median asking prices per square metre, median rents and gross rental yields for homes and condos in Roatán, San Pedro Sula and Tegucigalpa, Honduras, calculated from open listings on Hogarli.',
        url: `${SITE_URL}${PATH}`,
        dateModified: new Date().toISOString().slice(0, 10),
        temporalCoverage: ix.month.slice(0, 7),
        spatialCoverage: ix.cities.map((c) => ({ '@type': 'Place', name: `${c.name}, Honduras` })),
        creator: { '@id': `${SITE_URL}/#organization` },
        isAccessibleForFree: true,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        distribution: { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: `${SITE_URL}${PATH}/data.csv` },
        variableMeasured: ix.cities.filter((c) => c.perM2).map((c) => ({
          '@type': 'PropertyValue', name: `Median asking price per m², ${c.name}`, value: c.perM2!.value, unitText: 'USD/m²',
        })),
      })} />

      <h1>{t('Hogarli Price Index, {month}', { month })}</h1>
      <p className="prose__meta tiny muted">
        {t('Calculated live from {n} open home and condo listings', { n: fmtNumber(ix.total) })} · {t('Prices in US dollars')}
      </p>

      {facts.length > 0 && (
        <section className="answer" aria-label={t('Key findings')}>
          <span className="answer__k">{t('Key findings this month')}</span>
          <ul className="index-facts">{facts.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
      )}

      <section className="section">
        <div className="section__head"><h2>{t('Price per m² by city')}</h2></div>
        <div className="prose__table">
          <table className="table">
            <thead><tr>
              <th>{t('City')}</th><th>{t('Price per m²')}</th><th>{t('In a year')}</th>
              <th>{t('Median sale price')}</th><th>{t('Median rent')}</th><th>{t('Listings')}</th>
            </tr></thead>
            <tbody>
              {ix.cities.map((c) => (
                <tr key={c.slug}>
                  <td><Link className="link-accent" href={lp(`/listings?deal=sale&island=${encodeURIComponent(c.name)}`)}>{c.name}</Link></td>
                  <td><b>{c.perM2 ? usd(c.perM2.value) : '—'}</b></td>
                  <td><Change v={c.perM2} t={t} /></td>
                  <td>{c.saleMedian ? usd(c.saleMedian.value) : '—'}</td>
                  <td>{c.rentMedian ? `${usd(c.rentMedian.value)}${t('/mo')}` : '—'}</td>
                  <td className="muted">{fmtNumber(c.saleCount + c.rentCount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section__head">
          <h2>{t('Rent or buy: gross rental yield')}</h2>
          <p>{t('A year of median rent divided by the median sale price for homes of the same size. Before taxes, fees and empty months.')}</p>
        </div>
        <div className="prose__table">
          <table className="table">
            <thead><tr><th>{t('City')}</th><th>{t('Bedrooms')}</th><th>{t('Median sale price')}</th><th>{t('Median rent')}</th><th>{t('Gross yield')}</th></tr></thead>
            <tbody>
              {ix.cities.flatMap((c) => c.beds.filter((b) => b.sale || b.rent).map((b) => (
                <tr key={`${c.slug}-${b.beds}`}>
                  <td>{c.name}</td>
                  <td>{b.beds === 3 ? '3+' : b.beds === 0 ? t('Studio') : b.beds}</td>
                  <td>{b.sale ? usd(b.sale.value) : '—'}</td>
                  <td>{b.rent ? `${usd(b.rent.value)}${t('/mo')}` : '—'}</td>
                  <td><b>{b.yieldPct !== null ? `${b.yieldPct.toFixed(1)}%` : '—'}</b></td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section__head"><h2>{t('Areas by price per m²')}</h2></div>
        <div className="index-areas">
          {ix.cities.filter((c) => c.areas.length).map((c) => (
            <div key={c.slug}>
              <h3>{c.name}</h3>
              <ol className="index-areas__list">
                {c.areas.slice(0, 8).map((a) => (
                  <li key={a.name}>
                    <span>{a.name}</span>
                    <b>{usd(a.perM2.value)}</b>
                    <Change v={a.perM2} t={t} />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        {ix.rising.length > 0 && (
          <p className="small" style={{ marginTop: 16 }}>
            <b>{t('Fastest rising:')}</b> {ix.rising.map((a) => `${a.name} (${a.city}) +${a.perM2.change!.toFixed(1)}%`).join(', ')}
          </p>
        )}
      </section>

      <section className="section section--soft rounded">
        <div className="section__head">
          <h2>{t('For journalists')}</h2>
          <p>{t('The index is free to quote and republish. Please credit Hogarli and link to this page. The findings below are ready to paste.')}</p>
        </div>
        <CopyBox text={press} rows={Math.min(12, facts.length + 4)} label={t('Copy findings')} done={t('Copied')} />
        <p className="small" style={{ marginTop: 12 }}>
          <a className="link-accent" href={`${PATH}/data.csv`}>{t('Download the data (CSV)')}</a>
          {' · '}{t('Questions and custom data for your story:')} <Link className="link-accent" href={lp('/about')}>{t('contact the Hogarli team')}</Link>
        </p>
      </section>

      <section className="prose prose--flush">
        <h2>{t('How the index is calculated')}</h2>
        <ul>
          <li>{t('We take every open listing of a house or condo on Hogarli in the city. Land and commercial property are left out.')}</li>
          <li>{t('Each figure is a median, so a few luxury villas do not pull the number up. A group needs at least 3 listings to be shown.')}</li>
          <li>{t('Price per m² uses the living area given in the listing. Rents are monthly asking rents.')}</li>
          <li>{t('The change in a year compares the same listings’ prices today and twelve months ago, from our price history. It appears once enough history exists.')}</li>
          <li>{t('These are asking prices, not closed sales. Sale prices are rarely published in Honduras, so asking prices are the most current public signal.')}</li>
        </ul>
        <p className="small muted">
          {t('See also the')} <Link className="link-accent" href={lp('/market')}>{t('Roatán market report')}</Link> {t('with sourced figures on sales, closing costs and holiday rentals.')}
        </p>
      </section>
      <Crumbs items={crumbs.map((c) => ({ ...c, name: t(c.name) }))} />
    </div>
  );
}
