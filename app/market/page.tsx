import type { Metadata } from 'next';
import Link from 'next/link';
import Crumbs from '@/components/Crumbs';
import JsonLd from '@/components/JsonLd';
import SourceList from '@/components/SourceList';
import { areaForNeighborhood } from '@/lib/content/areas';
import { DIRECT_FLIGHTS, MARKET_FACTS, MARKET_UPDATED } from '@/lib/content/market';
import { queryListings } from '@/lib/db';
import { fmtDate, fmtNumber, fmtUsd } from '@/lib/format';
import { breadcrumbLd, graph } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: `Roatán real-estate market 2026: prices, sales and rentals | ${SITE_NAME}`,
  description: 'Roatán property market in numbers: about 340 homes for sale, a median sold price near $354K, ten months to sell, 3–7% closing costs and 43% holiday-rental occupancy. Sourced and updated.',
  alternates: { canonical: '/market' },
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export default async function MarketPage() {
  const all = await queryListings();
  const sale = all.filter((l) => l.deal === 'sale');
  const homes = sale.filter((l) => l.type !== 'land');
  const byArea = new Map<string, number>();
  all.forEach((l) => byArea.set(l.neighborhood, (byArea.get(l.neighborhood) ?? 0) + 1));
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Market report', path: '/market' }];

  return (
    <div className="wrap page">
      <JsonLd data={graph(breadcrumbLd(crumbs), {
        '@type': 'Dataset',
        name: 'Roatán real-estate market key figures',
        description: 'Key figures on Roatán’s property market: inventory, sales, prices, closing costs, taxes and short-term rentals, each with its source.',
        url: `${SITE_URL}/market`,
        dateModified: MARKET_UPDATED,
        spatialCoverage: { '@type': 'Place', name: 'Roatán, Islas de la Bahía, Honduras' },
        creator: { '@id': `${SITE_URL}/#organization` },
        isAccessibleForFree: true,
        variableMeasured: MARKET_FACTS.map((f) => ({ '@type': 'PropertyValue', name: f.label, value: f.value, description: f.note })),
        citation: [...new Set(MARKET_FACTS.map((f) => f.source.url))],
      })} />
      <Crumbs items={crumbs} />

      <h1>Roatán real-estate market report</h1>
      <p className="prose__meta tiny muted">Figures checked <time dateTime={MARKET_UPDATED}>{fmtDate(MARKET_UPDATED)}</time> · Resoha catalogue counts update live</p>

      <section className="answer" aria-label="Summary">
        <span className="answer__k">The market in one paragraph</span>
        <p>
          Roatán is a slow buyer’s market. About 340 homes were for sale in May 2026 and only 9 sold that month, with homes
          taking around ten months to sell. The median asking price was about $475,000 against a median sold price near
          $354,000, and buyers typically negotiate 5–9% off. Prices are rising about 6% a year in US dollars. Holiday
          rentals are consolidating: listings fell by half in a year while occupancy held at 43%.
        </p>
      </section>

      <section className="section">
        <div className="section__head"><h2>Key figures</h2></div>
        <div className="prose__table">
          <table className="table">
            <thead><tr><th>Metric</th><th>Value</th><th>Source</th></tr></thead>
            <tbody>
              {MARKET_FACTS.map((f) => (
                <tr key={f.label}>
                  <td>{f.label}{f.note && <span className="muted small"> ({f.note})</span>}</td>
                  <td><b>{f.value}</b></td>
                  <td><a className="link-accent small" href={f.source.url} target="_blank" rel="noopener">{f.source.name}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 12 }}>
          Direct flights to Roatán (RTB): {DIRECT_FLIGHTS.join(', ')}.
        </p>
      </section>

      <section className="section section--soft rounded">
        <div className="section__head">
          <h2>On Resoha right now</h2>
          <p>Live counts from our own catalogue. They grow as island agencies join.</p>
        </div>
        <div className="stats">
          <div className="stat"><span className="muted small">Active listings</span><b>{fmtNumber(all.length)}</b></div>
          <div className="stat"><span className="muted small">For sale</span><b>{fmtNumber(sale.length)}</b></div>
          <div className="stat"><span className="muted small">For rent</span><b>{fmtNumber(all.length - sale.length)}</b></div>
          <div className="stat"><span className="muted small">Median home asking price</span>
            <b>{median(homes.map((l) => l.price)) !== null ? fmtUsd(median(homes.map((l) => l.price))!) : '—'}</b></div>
        </div>
        <div className="chip-row">
          {[...byArea.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => {
            const area = areaForNeighborhood(name);
            return (
              <Link key={name} className="chip-btn" href={area ? `/areas/${area.slug}` : `/listings?neighborhoods=${encodeURIComponent(name)}`}>
                {name} · {n}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="prose prose--flush">
        <h2>What this means for buyers</h2>
        <ul>
          <li><b>You have time and leverage.</b> With roughly 340 homes on the market and single-digit monthly sales, there is no need to rush or to pay the asking price.</li>
          <li><b>Due diligence matters more than speed.</b> There is no MLS and agents need no licence, so verify the title and the seller. See <Link className="link-accent" href="/guides/how-to-check-land-title-in-roatan">how to check a land title</Link>.</li>
          <li><b>Budget beyond the price.</b> Add 3–7% for closing costs; see <Link className="link-accent" href="/guides/roatan-closing-costs">Roatán closing costs</Link>.</li>
          <li><b>Rental numbers need to be real.</b> Use island-wide occupancy and rates, not brochure projections; see <Link className="link-accent" href="/guides/roatan-rental-income">Roatán rental income</Link>.</li>
        </ul>
        <h2>Sources</h2>
        <SourceList sources={MARKET_FACTS.map((f) => f.source)} />
        <p className="small muted">
          Journalists and researchers are welcome to cite this page. Please link to {SITE_URL}/market.
        </p>
      </section>
    </div>
  );
}
