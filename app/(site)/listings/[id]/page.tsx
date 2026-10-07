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
import Gallery from '@/components/Gallery';
import DevelopmentDocs from '@/components/DevelopmentDocs';
import PriceHistory from '@/components/PriceHistory';
import { bumpViewsAfterResponse, getAgency, getAgent, getDevelopment, getFavorites, getListing, getPriceHistory, listBuildings, listDocuments, listUnitDocuments, queryListings } from '@/lib/db';
import { FeatureGrid, PhotoStrip, developmentFeatures, type Feature } from '@/components/DevelopmentFeatures';
import { DEAL_LABELS, TYPE_LABELS, fmtDate, fmtNumber, fmtPrice, fmtUsd, specLine } from '@/lib/format';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { FOREIGN_LIMIT_SQM, LAND_FIELDS, isChecked, landLabel, landNumbers, landState, readiness } from '@/lib/land';
import { fmtDate as fmtDay } from '@/lib/format';
import { currentUser } from '@/lib/session';
import { breadcrumbLd, graph, listingLd } from '@/lib/seo';
import { areaForNeighborhood } from '@/lib/content/areas';
import { categoryLabel, nearbyDistance } from '@/lib/nearby';
import { OPEN_STATUSES, stageLabel, statusLabel, toM2 } from '@/lib/units';
import { DETAIL_FIELDS, detailLabel, floorLine } from '@/lib/details';

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
  const [agent, agency, me, similarAll, landPeers, prices, devAll, dev, devBuildings, unitDocs, devDocs] = await Promise.all([
    getAgent(listing.agentId),
    getAgency(listing.agencyId),
    currentUser(),
    queryListings({ deal: listing.deal, neighborhoods: [listing.neighborhood] }),
    // уся земля на продаж — для медіани $/акр у паспорті
    listing.type === 'land' ? queryListings({ deal: 'sale', type: 'land' }) : Promise.resolve([]),
    getPriceHistory(listing.id),
    // інші квартири того самого ЖК
    listing.developmentId ? queryListings({ developmentId: listing.developmentId }) : Promise.resolve([]),
    // ЖК і його доми — для блоків «About the building» і «About the development»
    listing.developmentId ? getDevelopment(listing.developmentId) : Promise.resolve(null),
    listing.developmentId ? listBuildings(listing.developmentId) : Promise.resolve([]),
    // документи: спершу цієї квартири (план юніта), потім спільні для ЖК (декларація тощо)
    listing.developmentId ? listUnitDocuments(listing.id) : Promise.resolve([]),
    listing.developmentId ? listDocuments(listing.developmentId) : Promise.resolve([]),
  ]);
  const docs = [...unitDocs, ...devDocs];
  const building = devBuildings.find((b) => b.id === listing.buildingId) ?? null;
  const buildingFacts: Feature[] = dev ? ([
    ['layers', String(building?.floors ?? dev.floors ?? ''), 'floors'],
    ['sparkle', 'New build', 'type'],
    ['crane', building ? `${stageLabel(building.stage)}${building.completion ? ` · ${building.completion}` : ''}` : dev.completion, 'status'],
    ['bricks', dev.construction, 'construction'],
    ['snow', dev.climate, 'cooling & heating'],
    ['height', dev.ceiling, 'ceiling height'],
    ['bolt', dev.backupPower, 'backup power'],
    ['drop', dev.water, 'water supply'],
  ] as Feature[]).filter((f) => Boolean(f[1])) : [];
  // Автор може бути прихованим (заблокований акаунт) — тоді оголошення теж не показуємо
  if (!agent) notFound();

  const session = me;
  const favIds = session ? await getFavorites(session.id) : [];
  // сусіди по ЖК: спершу той самий дім, потім та сама угода, потім найближчі поверхи
  const siblings = devAll
    .filter((l) => l.id !== listing.id && l.active && OPEN_STATUSES.includes(l.status))
    .sort((a, b) =>
      Number(b.buildingId === listing.buildingId) - Number(a.buildingId === listing.buildingId)
      || Number(b.deal === listing.deal) - Number(a.deal === listing.deal)
      || Math.abs((a.floor ?? 0) - (listing.floor ?? 0)) - Math.abs((b.floor ?? 0) - (listing.floor ?? 0)))
    .slice(0, 8);
  const siblingIds = new Set(siblings.map((l) => l.id));
  const similar = similarAll.filter((l) => l.id !== listing.id && !siblingIds.has(l.id)).slice(0, 4);

  // таблиця характеристик: лише заповнені рядки
  const floorText = floorLine(listing.floor, listing.details.floorsTotal);
  const detailRows: [string, string][] = isLandType(listing.type) ? [] : ([
    ['Property type', TYPE_LABELS[listing.type]],
    ['Deal', DEAL_LABELS[listing.deal]],
    ['Bedrooms', listing.beds > 0 ? String(listing.beds) : 'Studio'],
    ['Bathrooms', listing.baths ? String(listing.baths) : ''],
    ['Interior', listing.sqft > 0 ? `${fmtNumber(listing.sqft)} ft² · ${toM2(listing.sqft)} m²` : ''],
    ['Lot', listing.lotAcres > 0 ? `${listing.lotAcres} ac` : ''],
    ['Unit', listing.unitNo],
    ['Floor', floorText],
    ['Year built', listing.year ? String(listing.year) : ''],
    ...DETAIL_FIELDS.filter((f) => !f.rentOnly || listing.deal === 'rent')
      .map((f): [string, string] => [f.label, detailLabel(f, listing.details[f.key])]),
    ['HOA', listing.hoa > 0 ? `${fmtUsd(listing.hoa)}/mo` : ''],
    ['Owner financing', listing.ownerFinancing ? 'Available' : ''],
  ] as [string, string][]).filter(([, v]) => v);
  const updatedAgo = ago(listing.updatedAt);

  const area = areaForNeighborhood(listing.neighborhood);
  const areaPath = area ? `/areas/${area.slug}` : `/listings?neighborhoods=${encodeURIComponent(listing.neighborhood)}`;

  const isLand = listing.type === 'land';
  const inDevelopment = listing.development !== null;
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
        {listing.development && <> · <Link href={`/developments/${listing.development.slug}`}>{listing.development.name}</Link></>}
      </div>

      <div className="gallery-wrap">
        <BackButton fallback={`/listings?deal=${listing.deal}`} />
        <Gallery photos={listing.photos} title={listing.title} />
      </div>

      <div className="prop">
        <div>
          <div className="prop__head">
            <div>
              <h1 style={{ fontSize: 28 }}>{listing.title}</h1>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {listing.address && <>{listing.address} · </>}{listing.neighborhood}, {listing.island}, Bay Islands
              </p>
              {listing.development && (
                <Link href={`/developments/${listing.development.slug}`} className="in-dev">
                  <Icon name="building" size={16} /> Unit in <b>{listing.development.name}</b> · see all units
                </Link>
              )}
            </div>
            <div className="prop__fav"><FavButton listingId={listing.id} initial={favIds.includes(listing.id)} /></div>
          </div>

          <div className="prop__price">
            {fmtPrice(listing.price, listing.deal)}
            {listing.status !== 'available' && <span className={`unit-status unit-status--${listing.status}`}>{statusLabel(listing.status)}</span>}
            {listing.deal === 'sale' && listing.sqft > 0 && (
              <span className="muted small" style={{ fontWeight: 500 }}>
                {' '}· {fmtUsd(Math.round(listing.price / listing.sqft))}/ft²
              </span>
            )}
            {listing.hoa > 0 && (
              <span className="muted small" style={{ fontWeight: 500 }}> · HOA {fmtUsd(listing.hoa)}/mo</span>
            )}
          </div>
          <p className="prop__updated" title={`Updated ${fmtDate(listing.updatedAt)}`}>
            <Icon name="calendar" size={14} /> Updated {updatedAgo} · listed {fmtDate(listing.createdAt)}
          </p>

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
                <div className="spec"><span className="muted small">Bathrooms</span><b>{listing.baths || '—'}</b></div>
                <div className="spec"><span className="muted small">Interior</span>
                  <b>{listing.sqft > 0 ? `${fmtNumber(listing.sqft)} ft²` : '—'}</b>
                  {inDevelopment && listing.sqft > 0 && <span className="muted small">{toM2(listing.sqft)} m²</span>}</div>
                {inDevelopment ? (
                  <div className="spec"><span className="muted small">Unit · floor</span>
                    <b>{listing.unitNo || '—'}{listing.floor !== null && ` · ${listing.floor}`}</b></div>
                ) : (
                  <div className="spec"><span className="muted small">Built</span><b>{listing.year || '—'}</b></div>
                )}
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

          {detailRows.length > 0 && (
            <section id="details">
              <h3 style={{ marginTop: 26 }}>Details</h3>
              <dl className="details">
                {detailRows.map(([k, v]) => (
                  <div key={k} className="details__row"><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
            </section>
          )}

          <section id="price-history">
            <h3 style={{ marginTop: 26 }}>Price history</h3>
            <PriceHistory points={prices} deal={listing.deal} price={listing.price} since={listing.createdAt} />
          </section>

          {/* Місця поблизости — їх додає ріелтор у формі; точки з координатами є й на карті нижче */}
          {listing.nearby.length > 0 && (
            <section className="nearby" id="nearby">
              <h3 style={{ marginTop: 26, marginBottom: 12 }}>What&apos;s nearby</h3>
              <ul className="nearby__list">
                {listing.nearby.map((p, i) => {
                  const dist = nearbyDistance(p, listing);
                  return (
                    <li key={i} className="nearby__item">
                      <span className="nearby__name">
                        <b>{p.name}</b>
                        <span className="small muted">{categoryLabel(p.category)}</span>
                      </span>
                      {dist && <span className="nearby__dist">{dist}</span>}
                    </li>
                  );
                })}
              </ul>
              <p className="tiny muted" style={{ marginTop: 8 }}>
                Added by the listing agent — check opening hours before you go.
              </p>
            </section>
          )}

          <h3 style={{ marginTop: 26, marginBottom: 12 }}>Location</h3>
          <div id="miniMap">
            <MapView items={[listing]} center={[listing.lat, listing.lng]} detail places={listing.nearby} />
          </div>

          {dev && (
            <section className="about-dev" id="building">
              <h3 style={{ marginTop: 30 }}>About the building</h3>
              <p className="small" style={{ margin: '4px 0 12px', fontWeight: 600 }}>
                {building?.name ?? dev.name}{(building?.address || dev.address) && ` · ${building?.address || dev.address}`}
              </p>
              <PhotoStrip photos={building?.photo ? [building.photo, ...dev.photos.filter((p) => p !== building.photo)] : dev.photos}
                title={building?.name ?? dev.name} />
              <FeatureGrid items={buildingFacts} />
            </section>
          )}

          {dev && docs.length > 0 && (
            <section id="documents">
              <h3 style={{ marginTop: 30, marginBottom: 12 }}>Documents</h3>
              <DevelopmentDocs docs={docs} />
            </section>
          )}

          {dev && (
            <section className="about-dev" id="development">
              <h3 style={{ marginTop: 30 }}>About {dev.name}</h3>
              <PhotoStrip photos={dev.photos} title={dev.name} />
              <FeatureGrid items={developmentFeatures(dev, devBuildings, devAll)} />
              <Link href={`/developments/${dev.slug}`} className="btn btn--ghost" style={{ marginTop: 16 }}>
                Open {dev.name} <Icon name="arrowRight" size={18} />
              </Link>
            </section>
          )}

          <p className="tiny muted" style={{ marginTop: 14 }}>
            Listing ID {listing.id} · listed {fmtDate(listing.createdAt)} · updated {fmtDate(listing.updatedAt)} · {fmtNumber(listing.views)} views
          </p>
        </div>

        <AgentContact agent={agent} agency={agency} listing={listing} listingUrl={`${SITE_URL}/listings/${listing.id}`}
          isFav={favIds.includes(listing.id)}
          me={me && me.role === 'user' ? { name: me.name, phone: me.phone, email: me.email } : null} />
      </div>

      {siblings.length > 0 && listing.development && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section__head">
            <div><h2>Other units in {listing.development.name}</h2></div>
            <Link className="btn btn--ghost" href={`/developments/${listing.development.slug}`}>See all units <Icon name="arrowRight" size={18} /></Link>
          </div>
          <div className="grid grid--4">
            {siblings.map((l) => <ListingCard key={l.id} listing={l} isFav={favIds.includes(l.id)} />)}
          </div>
        </section>
      )}

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

const isLandType = (t: string) => t === 'land';

/** «today», «yesterday», «5 days ago», «3 months ago» — як «Оновлено» у LUN */
function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? 'a month ago' : `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'a year ago' : `${years} years ago`;
}
