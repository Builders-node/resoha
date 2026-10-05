import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import AgentContact from '@/components/AgentContact';
import FavButton from '@/components/FavButton';
import BackButton from '@/components/BackButton';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import ListingCard from '@/components/ListingCard';
import Photo from '@/components/Photo';
import { bumpViewsAfterResponse, getAgent, getFavorites, getListing, queryListings } from '@/lib/db';
import { DEAL_LABELS, TYPE_LABELS, fmtDate, fmtNumber, fmtPrice, fmtUsd, specLine } from '@/lib/format';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { FOREIGN_LIMIT_SQM, LAND_FIELDS, isChecked, landLabel, landNumbers, landState, readiness } from '@/lib/land';
import { fmtDate as fmtDay } from '@/lib/format';
import { currentUser } from '@/lib/session';
import { breadcrumbLd, graph, listingLd } from '@/lib/seo';
import { areaForNeighborhood } from '@/lib/content/areas';

const MapView = dynamic(() => import('@/components/MapView'));

// метадані й сама сторінка питають те саме оголошення — один запит на двох
const loadListing = cache(getListing);

/** Посилання на обʼєкт пересилають у месенджерах — у превʼю мають бути назва, ціна й район. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const l = await loadListing(id);
  if (!l) return { title: `Listing not found — ${SITE_NAME}` };

  const title = `${l.title} — ${fmtPrice(l.price, l.deal)}`;
  const description = `${specLine(l)} · ${l.neighborhood}, Roatán. ${l.text}`.slice(0, 200);
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: `/listings/${l.id}` },
    openGraph: { title, description, url: `/listings/${l.id}`, type: 'website', siteName: SITE_NAME },
  };
}

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await loadListing(id);
  if (!listing) notFound();

  // лічильник переглядів — запис, і він не має тримати рендер: виконуємо після відповіді
  await bumpViewsAfterResponse(id);

  // усе інше не залежить одне від одного, тож ходимо в базу паралельно
  const [agent, me, similarAll, landPeers] = await Promise.all([
    getAgent(listing.agentId),
    currentUser(),
    queryListings({ deal: listing.deal, neighborhoods: [listing.neighborhood] }),
    // уся земля на продаж — для медіани $/акр у паспорті
    listing.type === 'land' ? queryListings({ deal: 'sale', type: 'land' }) : Promise.resolve([]),
  ]);
  // Автор може бути прихованим (заблокований акаунт) — тоді оголошення теж не показуємо
  if (!agent) notFound();

  const session = me;
  const favIds = session ? await getFavorites(session.id) : [];
  const similar = similarAll.filter((l) => l.id !== listing.id).slice(0, 4);

  const area = areaForNeighborhood(listing.neighborhood);
  const areaPath = area ? `/areas/${area.slug}` : `/listings?neighborhoods=${encodeURIComponent(listing.neighborhood)}`;

  const isLand = listing.type === 'land';
  // титул: якщо паспорт ділянки заповнено, він головніший за старий прапорець titled
  const titleOk = listing.land?.checkedAt ? listing.land.titleStatus === 'registered' : listing.titled;

  return (
    <div className="wrap">
      <JsonLd data={graph(listingLd(listing, agent.name), breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: DEAL_LABELS[listing.deal], path: `/listings?deal=${listing.deal}` },
        { name: listing.neighborhood, path: areaPath },
        { name: listing.title, path: `/listings/${listing.id}` },
      ]))} />
      <div className="crumbs small muted">
        <Link href="/">Home</Link> ·{' '}
        <Link href={`/listings?deal=${listing.deal}`}>{DEAL_LABELS[listing.deal]}</Link> ·{' '}
        <Link href={areaPath}>{listing.neighborhood}</Link>
      </div>

      <div className="gallery-wrap">
        <BackButton fallback={`/listings?deal=${listing.deal}`} />
        {listing.photos.length > 0 ? (
          <div className="gallery">
            {listing.photos.slice(0, 5).map((p, i) => (
              <Photo key={p} src={p} alt={`${listing.title} — photo ${i + 1}`} eager={i === 0} />
            ))}
          </div>
        ) : (
          <div className="gallery gallery--empty">
            <Photo label="No photos yet — ask the agency for the full set" />
          </div>
        )}
      </div>

      <div className="prop">
        <div>
          <div className="prop__head">
            <div>
              <h1 style={{ fontSize: 28 }}>{listing.title}</h1>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {listing.address} · {listing.neighborhood}, {listing.island}, Bay Islands
              </p>
            </div>
            <div className="prop__fav"><FavButton listingId={listing.id} initial={favIds.includes(listing.id)} /></div>
          </div>

          <div className="prop__price">
            {fmtPrice(listing.price, listing.deal)}
            {listing.deal === 'sale' && listing.sqft > 0 && (
              <span className="muted small" style={{ fontWeight: 500 }}>
                {' '}· {fmtUsd(Math.round(listing.price / listing.sqft))}/ft²
              </span>
            )}
            {listing.hoa > 0 && (
              <span className="muted small" style={{ fontWeight: 500 }}> · HOA {fmtUsd(listing.hoa)}/mo</span>
            )}
          </div>

          <div className="specs">
            {isLand ? (
              <>
                <div className="spec"><span className="muted small">Lot size</span><b>{listing.lotAcres} ac</b></div>
                <div className="spec"><span className="muted small">Frontage</span><b>{listing.oceanfront ? 'Oceanfront' : 'Inland'}</b></div>
                <div className="spec"><span className="muted small">Title</span><b>{titleOk ? 'Free & clear' : 'Not confirmed'}</b></div>
                <div className="spec"><span className="muted small">Type</span><b>{TYPE_LABELS[listing.type]}</b></div>
              </>
            ) : (
              <>
                <div className="spec"><span className="muted small">Bedrooms</span>
                  <b>{listing.beds > 0 ? listing.beds : 'Studio'}</b></div>
                <div className="spec"><span className="muted small">Bathrooms</span><b>{listing.baths}</b></div>
                <div className="spec"><span className="muted small">Interior</span>
                  <b>{listing.sqft > 0 ? `${fmtNumber(listing.sqft)} ft²` : '—'}</b></div>
                <div className="spec"><span className="muted small">Built</span><b>{listing.year || '—'}</b></div>
              </>
            )}
          </div>

          <div className="chips">
            <span className="chip">{TYPE_LABELS[listing.type]}</span>
            <span className="chip">{DEAL_LABELS[listing.deal]}</span>
            {listing.oceanfront && <span className="chip"><Icon name="wave" size={16} /> Oceanfront</span>}
            {titleOk && <span className="chip"><Icon name="deed" size={16} /> Free &amp; clear title</span>}
            {listing.lotAcres > 0 && !isLand && <span className="chip">{listing.lotAcres} ac lot</span>}
            {listing.tags.map((t) => <span key={t} className="chip">{t}</span>)}
          </div>

          {/* Паспорт ділянки: відповіді на те, що покупець землі питає першим */}
          {isLand && (() => {
            const land = listing.land;
            const r = readiness(land);
            const checked = isChecked(land);
            const n = landNumbers(listing, landPeers);
            return (
              <section className="land" id="land-check">
                <div className="land__head">
                  <div>
                    <h3>Land passport</h3>
                    <span className="muted small">
                      {checked
                        ? <>Checked {fmtDay(land.checkedAt!)}{land.checkedBy && <> by {land.checkedBy}</>}</>
                        : 'Nobody has confirmed these details yet — ask the agent before you commit.'}
                    </span>
                  </div>
                  <span className={`land__score land__score--${r.tone}`}>
                    {r.label}{checked && <small> · {r.score}/{r.of}</small>}
                  </span>
                </div>

                <h4 className="land__sub">The lot in numbers</h4>
                <div className="land__stats">
                  {n.acres > 0 && (
                    <div className="land__stat">
                      <span className="land__k">Size</span>
                      <b>{fmtNumber(n.sqm)} m²</b>
                      <span className="small muted">{n.acres} ac · {fmtNumber(n.sqft)} ft²</span>
                    </div>
                  )}
                  {n.perAcre > 0 && (
                    <div className="land__stat">
                      <span className="land__k">Price per acre</span>
                      <b>{fmtUsd(Math.round(n.perAcre))}</b>
                      <span className="small muted">
                        {fmtUsd(Math.round(n.perSqm))}/m²
                        {n.benchmark && n.vsBenchmark !== null && (
                          <> · <span className={n.vsBenchmark > 10 ? 'land__up' : n.vsBenchmark < -10 ? 'land__down' : ''}>
                            {n.vsBenchmark === 0 ? 'at' : `${Math.abs(n.vsBenchmark)}% ${n.vsBenchmark > 0 ? 'above' : 'below'}`}
                          </span>{' '}the {n.benchmark.where} median of {fmtUsd(Math.round(n.benchmark.perAcre))}/ac
                          {' '}({n.benchmark.count} lots)</>
                        )}
                      </span>
                    </div>
                  )}
                  {n.closing && (
                    <div className="land__stat">
                      <span className="land__k">Cost to buy</span>
                      <b>{fmtUsd(Math.round(n.closing.low))}–{fmtUsd(Math.round(n.closing.high))}</b>
                      <span className="small muted">
                        Typical 4–5.5% closing costs: 1.5% transfer tax, attorney, notary, registration.{' '}
                        <Link href="/guides/roatan-closing-costs">How it adds up</Link>
                      </span>
                    </div>
                  )}
                  {n.taxMax > 0 && (
                    <div className="land__stat">
                      <span className="land__k">Property tax</span>
                      <b>up to {fmtUsd(Math.round(n.taxMax))}/yr</b>
                      <span className="small muted">0.25% of the cadastral value, which is usually below the asking price.</span>
                    </div>
                  )}
                  {n.foreign && (
                    <div className={`land__stat land__stat--${n.foreign === 'personal' ? 'ok' : 'warn'}`}>
                      <span className="land__k">Foreign buyers</span>
                      <b>{n.foreign === 'personal' ? 'Can own in your name' : 'Needs a Honduran company'}</b>
                      <span className="small muted">
                        {n.foreign === 'personal'
                          ? `Under the ${fmtNumber(FOREIGN_LIMIT_SQM)} m² limit for a foreigner’s home (Decree 90-90).`
                          : `Over the ${fmtNumber(FOREIGN_LIMIT_SQM)} m² a foreigner can hold personally; larger lots are usually bought through a company.`}
                        {' '}<Link href="/guides/can-foreigners-buy-property-in-roatan">The 3,000 m² rule</Link>
                      </span>
                    </div>
                  )}
                  <div className="land__stat">
                    <span className="land__k">Distances</span>
                    <ul className="land__dist">
                      {n.distances.map((d) => (
                        <li key={d.name}><span>{d.name}</span><b>{d.km < 1 ? '<1' : d.km.toFixed(d.km < 10 ? 1 : 0)} km</b></li>
                      ))}
                    </ul>
                    <span className="tiny muted">Straight line; roads are longer.</span>
                  </div>
                </div>

                <h4 className="land__sub">Checked on the ground</h4>
                <div className="land__rows">
                  {LAND_FIELDS.map((f) => {
                    const value = checked ? land[f.key] : 'unknown';
                    const state = landState(f, value);
                    return (
                      <div key={f.key} className={`land__row land__row--${state}`}>
                        <span className="land__k">{f.label}</span>
                        <span className="land__v">
                          {state === 'ok' && <Icon name="check" size={20} />}
                          {landLabel(f, value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="land__foot">
                  <a className="btn btn--ghost" href={`/listings/${listing.id}/report`} target="_blank" rel="noreferrer">
                    <Icon name="link" size={16} /> Download land report (PDF)
                  </a>
                  <span className="tiny muted">
                    “Ready to build” means title, road, electricity and water are all in place. Costs and limits are
                    estimates from our guides, not legal advice: always verify the title at the Instituto de la Propiedad
                    and check the numbers with your attorney before paying a deposit.
                  </span>
                </div>
              </section>
            );
          })()}

          <h3 style={{ marginTop: 26 }}>About this property</h3>
          <p className="muted" style={{ marginTop: 8, fontSize: 15.5 }}>{listing.text}</p>

          {listing.sourceName && (
            <p className="src">
              <Icon name="link" size={16} />
              <span>
                Facts on this page come from <b>{listing.sourceName}</b>
                {listing.sourceRef && <> · {listing.sourceRef}</>}, who hold the listing.
                {listing.sourceUrl && (
                  <>
                    {' '}
                    <a href={listing.sourceUrl} target="_blank" rel="noreferrer nofollow">Open the original listing</a>
                  </>
                )}
              </span>
            </p>
          )}

          <h3 style={{ marginTop: 26, marginBottom: 12 }}>Location</h3>
          <div id="miniMap">
            <MapView items={[listing]} center={[listing.lat, listing.lng]} detail />
          </div>

          <p className="tiny muted" style={{ marginTop: 14 }}>
            Listing ID {listing.id} · listed {fmtDate(listing.createdAt)} · {fmtNumber(listing.views)} views
          </p>
        </div>

        <AgentContact agent={agent} listing={listing} listingUrl={`${SITE_URL}/listings/${listing.id}`}
          me={me && me.role === 'user' ? { name: me.name, phone: me.phone, email: me.email } : null} />
      </div>

      {similar.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section__head"><div><h2>More in {listing.neighborhood}</h2></div></div>
          <div className="grid grid--4">
            {similar.map((l) => <ListingCard key={l.id} listing={l} isFav={favIds.includes(l.id)} />)}
          </div>
        </section>
      )}
    </div>
  );
}
