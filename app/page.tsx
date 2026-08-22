import Link from 'next/link';
import Icon from '@/components/Icon';
import AgencyRow from '@/components/AgencyRow';
import ListingCard from '@/components/ListingCard';
import { agencyBoard, getFavorites, queryListings } from '@/lib/db';
import { fmtNumber, fmtUsd, nListings, photoUrl } from '@/lib/format';
import { getSession } from '@/lib/session';

const SALE_TILES = [
  { label: 'Condos', href: '/listings?deal=sale&type=condo', img: 'tile-condo' },
  { label: 'Houses & villas', href: '/listings?deal=sale&type=house', img: 'tile-villa' },
  { label: 'Land', href: '/listings?deal=sale&type=land', img: 'tile-land', isNew: true },
  { label: 'Commercial', href: '/listings?deal=sale&type=commercial', img: 'tile-commercial' },
];
const RENT_TILES = [
  { label: 'Condos', href: '/listings?deal=rent&type=condo', img: 'tile-rent-condo' },
  { label: 'Houses', href: '/listings?deal=rent&type=house', img: 'tile-rent-house' },
];

export default async function HomePage() {
  const session = await getSession();
  const favIds = session ? await getFavorites(session.id) : [];

  const all = await queryListings();
  const featured = [...all].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 4);
  const fresh = (await queryListings({ sort: 'new' })).slice(0, 4);

  const byArea = new Map<string, { count: number; from: number }>();
  all.filter((l) => l.deal === 'sale').forEach((l) => {
    const cur = byArea.get(l.neighborhood) ?? { count: 0, from: Infinity };
    byArea.set(l.neighborhood, { count: cur.count + 1, from: Math.min(cur.from, l.price) });
  });
  const areas = [...byArea.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 4);

  const board = await agencyBoard();
  const agencies = board.slice(0, 5);
  const agencyNameById = new Map(board.map((b) => [b.agency.id, b.agency.name]));

  return (
    <>
      <section className="wrap home-top">
        <div className="tiles-block">
          <select className="select-lg" defaultValue="Roatán" aria-label="Island">
            <option>Roatán</option>
            <option disabled>Utila (soon)</option>
            <option disabled>Guanaja (soon)</option>
          </select>

          <h3>For sale</h3>
          <div className="tiles">
            {SALE_TILES.map((t) => (
              <Link key={t.label} className="tile" href={t.href}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(t.img, 200, 200)} alt="" />
                {t.isNew && <span className="tile__new">New</span>}
                <span>{t.label}</span>
              </Link>
            ))}
          </div>

          <h3>For rent</h3>
          <div className="tiles">
            {RENT_TILES.map((t) => (
              <Link key={t.label} className="tile tile--wide" href={t.href}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(t.img, 260, 200)} alt="" />
                <span>{t.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <aside className="promo">
          <h2>Roatán price report: what the island actually costs</h2>
          <p>
            Median $/ft² by area, how long listings sit, and which communities moved this quarter —
            built from every listing on Resoha.
          </p>
          <div>
            <Link className="btn btn--orange btn--lg" href="/listings?sort=price_desc">See the market <Icon name="arrowRight" size={18} /></Link>
          </div>
        </aside>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>Featured on Roatán</h2>
            <Link className="btn btn--primary" href="/listings?deal=sale">See all {nListings(all.filter((l) => l.deal === 'sale').length)} <Icon name="arrowRight" size={18} /></Link>
            <p>Hand-picked homes, condos and land with verified titles</p>
          </div>
          <div className="grid grid--4">
            {featured.map((l) => (
              <ListingCard key={l.id} listing={l} ratio="tall" isFav={favIds.includes(l.id)}
                agentName={agencyNameById.get(l.agencyId ?? '')} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="wrap">
          <div className="section__head">
            <h2>Browse by area</h2>
            <p>From West Bay&apos;s beach condos to the quiet East End</p>
          </div>
          <div className="grid grid--4">
            {areas.map(([name, a]) => (
              <Link key={name} className="ov ov--area" href={`/listings?neighborhoods=${encodeURIComponent(name)}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" src={photoUrl(`area-${name}`, 560, 380)} alt={name} />
                <div className="ov__b">
                  <div className="ov__title" style={{ fontSize: 19 }}>{name}</div>
                  <div className="ov__meta">{nListings(a.count)} · from {fmtUsd(a.from)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>Just listed</h2>
            <Link className="btn btn--primary" href="/listings?deal=sale&sort=new">All new listings <Icon name="arrowRight" size={18} /></Link>
          </div>
          <div className="grid grid--4">
            {fresh.map((l) => (
              <ListingCard key={l.id} listing={l} isFav={favIds.includes(l.id)} agentName={agencyNameById.get(l.agencyId ?? '')} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--soft">
        <div className="wrap">
          <div className="section__head"><h2>Buying on Roatán, in plain terms</h2></div>
          <div className="grid grid--3">
            <div className="panel">
              <h3>Title first, always</h3>
              <p className="muted small" style={{ marginTop: 8 }}>
                Listings marked <b>Free &amp; clear title</b> have a registered, searchable title. Untitled
                land is the most common way buyers lose money here — so it&apos;s a filter, not a footnote.
              </p>
            </div>
            <div className="panel">
              <h3>The 3,000 m² rule</h3>
              <p className="muted small" style={{ marginTop: 8 }}>
                A foreign buyer may hold up to 3,000 m² (0.74 acre) directly for residential use. Larger
                parcels are normally held through a Honduran corporation.
              </p>
            </div>
            <div className="panel">
              <h3>Water, power, internet</h3>
              <p className="muted small" style={{ marginTop: 8 }}>
                Cistern size, generator, solar and Starlink matter more than square footage on an island.
                They live in the specs and in the filters.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section__head">
            <h2>Real-estate agencies</h2>
            <Link className="btn btn--primary" href="/agent">Join as an agent <Icon name="arrowRight" size={18} /></Link>
            <p>Licensed agencies working the island — open one to see everything they have listed</p>
          </div>
          <AgencyRow rows={agencies} />
        </div>
      </section>

      <section className="section">
        <div className="wrap cta">
          <div>
            <h2 style={{ fontSize: 30 }}>Selling on the island?</h2>
            <p className="muted" style={{ fontSize: 17, margin: '12px 0 22px' }}>
              Publish listings, take enquiries from buyers flying in, and track views from your own dashboard.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link className="btn btn--primary btn--lg" href="/agent">Agent dashboard</Link>
              <Link className="btn btn--ghost btn--lg" href="/account">Buyer account</Link>
            </div>
          </div>
          <div className="stats" style={{ gridTemplateColumns: '1fr 1fr', margin: 0 }}>
            <div className="stat"><span className="muted small">Listings</span><b>{all.length}</b></div>
            <div className="stat"><span className="muted small">Agents</span><b>{board.length}</b></div>
            <div className="stat"><span className="muted small">Areas covered</span><b>{byArea.size}</b></div>
            <div className="stat"><span className="muted small">Views</span><b>{fmtNumber(all.reduce((s, l) => s + l.views, 0))}</b></div>
          </div>
        </div>
      </section>
    </>
  );
}
