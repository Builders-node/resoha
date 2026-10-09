import { cache } from 'react';
import type { Metadata } from 'next';
import { localized } from '@/lib/seoMeta';
import type { Listing } from '@/lib/types';
import Link from 'next/link';
import { lifecycle } from '@/lib/lifecycle';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import AgentContact from '@/components/AgentContact';
import FavButton from '@/components/FavButton';
import CompareButton from '@/components/CompareButton';
import BackButton from '@/components/BackButton';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import ListingCard from '@/components/ListingCard';
import Gallery from '@/components/Gallery';
import PhotoTour from '@/components/PhotoTour';
import DevelopmentDocs from '@/components/DevelopmentDocs';
import PriceHistory from '@/components/PriceHistory';
import PurchaseCalculator from '@/components/PurchaseCalculator';
import { RecordView } from '@/components/RecentlyViewed';
import { trackAfterResponse } from '@/lib/track';
import { trackPromo } from '@/lib/promo';
import { getAgency, getAgent, getDevelopment, getFavorites, getListing, getPriceHistory, getSiteSettings, listBuildings, listDocuments, listUnitDocuments, queryListings } from '@/lib/db';
import { FeatureGrid, PhotoStrip, developmentFeatures, type Feature } from '@/components/DevelopmentFeatures';
import { DEAL_LABELS, TYPE_LABELS, fmtDate, fmtNumber, fmtPerArea, fmtPrice, fmtUsd, specLine, sqftToM2 } from '@/lib/format';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { FOREIGN_LIMIT_SQM, LAND_FIELDS, isChecked, landLabel, landNumbers, landState, readiness } from '@/lib/land';
import { fmtDate as fmtDay } from '@/lib/format';
import { currentUser } from '@/lib/session';
import { breadcrumbLd, graph, listingLd } from '@/lib/seo';
import { areaForNeighborhood } from '@/lib/content/areas';
import { categoryLabel, nearbyDistance } from '@/lib/nearby';
import { OPEN_STATUSES, stageLabel, statusLabel } from '@/lib/units';
import { DETAIL_FIELDS, IN_UNIT, detailLabel, floorLine } from '@/lib/details';
import { photoTour } from '@/lib/rooms';
import { getLang, getLp } from '@/lib/i18n/server';
import { makeT, type T } from '@/lib/i18n';
import ListingGone from '@/components/ListingGone';
import ListingTools from '@/components/ListingTools';
import { getGoneListing, similarActive, type GoneListing } from '@/lib/gone';
import { rankSimilar } from '@/lib/similar';

const MapView = dynamic(() => import('@/components/MapView'));

/** Рядок у «Details»: іконка, значення і, якщо без нього незрозуміло, підпис */
type Fact = [icon: string, value: string, hint?: string];

// метадані й сама сторінка питають те саме оголошення — один запит на двох
const loadListing = cache(getListing);

/** Посилання на обʼєкт пересилають у месенджерах — у превʼю мають бути назва, ціна й район. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const l = await loadListing(id);
  if (!l) {
    // знятий з показу: сторінка «більше недоступний» не індексується, але посилання з неї ведуть далі
    const g = await getGoneListing(id);
    return g
      ? { title: `${g.title} — no longer available | ${SITE_NAME}`, robots: { index: false, follow: true } }
      : { title: `Listing not found — ${SITE_NAME}` };
  }

  const title = `${l.title} — ${fmtPrice(l.price, l.deal)}`;
  const description = `${specLine(l)} · ${l.neighborhood}, Roatán. ${l.text}`.slice(0, 200);
  return localized(`/listings/${l.id}`, {
    title: `${title} | ${SITE_NAME}`,
    description,
    openGraph: { title, description, url: `/listings/${l.id}`, type: 'website', siteName: SITE_NAME },
    ...(soldStandalone(l) ? { robots: { index: false, follow: true } } : {}),
  });
}

/** Продане чи здане окреме оголошення (квартири ЖК лишаються в шахматці ЖК зі статусом) */
const soldStandalone = (l: Pick<Listing, 'status' | 'developmentId'>) =>
  !l.developmentId && (l.status === 'sold' || l.status === 'rented');

/** Сторінка «обʼєкт більше недоступний» із схожими живими обʼєктами в тому ж районі */
async function GonePage({ id, gone }: { id: string; gone: GoneListing }) {
  const [similar, lang, me] = await Promise.all([similarActive(gone, id), getLang(), currentUser()]);
  const favIds = me ? await getFavorites(me.id) : [];
  return <ListingGone gone={gone} similar={similar} favIds={favIds} t={makeT(lang)} lang={lang} />;
}

export default async function PropertyPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ utm_source?: string }>;
}) {
  const lp = await getLp();
  const { id } = await params;
  const listing = await loadListing(id);
  if (!listing) {
    // RLS ховає від гостей прострочене, приховане й неперевірене — але таке оголошення існувало
    const gone = await getGoneListing(id);
    if (!gone) notFound();
    return <GonePage id={id} gone={gone} />;
  }
  if (soldStandalone(listing)) {
    // продане бачать як звичайну сторінку лише автор, власник агенції й адмін
    const viewer = await currentUser();
    const manages = viewer && (viewer.id === listing.agentId || viewer.isAdmin
      || (viewer.isOwner && viewer.agencyId !== null && viewer.agencyId === listing.agencyId));
    if (!manages) {
      return <GonePage id={id} gone={{
        title: listing.title, neighborhood: listing.neighborhood, island: listing.island,
        type: listing.type, deal: listing.deal, price: listing.price, sold: true,
      }} />;
    }
  }

  // перегляд для аналітики (і лічильника views) — запис, і він не має тримати рендер: виконуємо після відповіді
  await trackAfterResponse({ listingId: id }, 'view', { utm: (await searchParams).utm_source });
  await trackPromo('listing', [listing], 'click');

  // усе інше не залежить одне від одного, тож ходимо в базу паралельно
  const [agent, agency, me, similarAll, landPeers, prices, devAll, dev, devBuildings, lang, unitDocs, devDocs, site] = await Promise.all([
    getAgent(listing.agentId),
    getAgency(listing.agencyId),
    currentUser(),
    // «схожі»: уся угода по острову — ранжуємо за ціною, типом, спальнями й відстанню (lib/similar.ts)
    queryListings({ deal: listing.deal }).catch(() => []),
    // уся земля на продаж — для медіани $/акр у паспорті
    listing.type === 'land' ? queryListings({ deal: 'sale', type: 'land' }) : Promise.resolve([]),
    getPriceHistory(listing.id),
    // інші квартири того самого ЖК
    listing.developmentId ? queryListings({ developmentId: listing.developmentId }) : Promise.resolve([]),
    // ЖК і його доми — для блоків «About the building» і «About the development»
    listing.developmentId ? getDevelopment(listing.developmentId) : Promise.resolve(null),
    listing.developmentId ? listBuildings(listing.developmentId) : Promise.resolve([]),
    getLang(),
    // документи: спершу цієї квартири (план юніта), потім спільні для ЖК (декларація тощо)
    listing.developmentId ? listUnitDocuments(listing.id) : Promise.resolve([]),
    listing.developmentId ? listDocuments(listing.developmentId) : Promise.resolve([]),
    getSiteSettings(),
  ]);
  const t = makeT(lang);
  const docs = [...unitDocs, ...devDocs];
  const building = devBuildings.find((b) => b.id === listing.buildingId) ?? null;
  const buildingFacts: Feature[] = dev ? ([
    ['layers', String(building?.floors ?? dev.floors ?? ''), 'floors'],
    ['sparkle', t('New build'), 'type'],
    ['crane', building ? `${t(stageLabel(building.stage))}${building.completion ? ` · ${building.completion}` : ''}` : dev.completion, 'status'],
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
  // платний «Premium agent» (міграція 0060): поруч лише інші обʼєкти цього ж ріелтора, без конкурентів
  const premium = !!listing.promo?.includes('premium_agent');
  const similar = premium
    ? (await queryListings({ agentId: listing.agentId })).filter((l) => l.id !== listing.id && !siblingIds.has(l.id)).slice(0, 4)
    : rankSimilar(listing, similarAll, siblingIds, 4);

  // «Details», як у LUN: іконка й коротке значення, три колонки; порожнє не показуємо
  const floorText = floorLine(listing.floor, listing.details.floorsTotal, lang);
  const m2 = listing.sqft > 0 ? sqftToM2(listing.sqft) : 0;
  const facts: Fact[] = isLandType(listing.type) ? [] : ([
    ['bed', listing.beds > 0 ? t(listing.beds === 1 ? '1 bedroom' : '{n} bedrooms', { n: listing.beds }) : t('Studio')],
    ['bath', listing.baths ? t(listing.baths === 1 ? '1 bathroom' : '{n} bathrooms', { n: listing.baths }) : ''],
    ['area', m2 ? `${fmtNumber(m2)} m² · ${fmtNumber(listing.sqft)} ft²` : ''],
    ['stairs', listing.floor !== null ? t('floor {floor}', { floor: floorText }) : floorText],
    ['door', listing.unitNo ? t('unit {n}', { n: listing.unitNo }) : ''],
    ['fence', listing.lotAcres > 0 ? t('{n} ac lot', { n: listing.lotAcres }) : ''],
    ['calendar', listing.year ? t('built {year}', { year: listing.year }) : ''],
    ...DETAIL_FIELDS.filter((f) => !f.rentOnly || listing.deal === 'rent')
      .map((f): Fact => [f.icon, t(detailLabel(f, listing.details[f.key])), f.hint && t(f.hint)]),
    ['wallet', listing.hoa > 0 ? `${fmtUsd(listing.hoa)}${t('/mo')}` : '', t('HOA')],
    ['deed', listing.ownerFinancing ? t('Owner financing available') : ''],
  ] as Fact[]).filter(([, v]) => v);
  const inUnit = IN_UNIT.filter(([k]) => listing.details.inUnit?.includes(k));
  const updatedAgo = ago(listing.updatedAt, t);

  const area = areaForNeighborhood(listing.neighborhood);
  const areaPath = area ? `/areas/${area.slug}` : `/listings?neighborhoods=${encodeURIComponent(listing.neighborhood)}`;

  const isLand = listing.type === 'land';
  const inDevelopment = listing.development !== null;
  const lc = lifecycle(listing);
  // титул: якщо паспорт ділянки заповнено, він головніший за старий прапорець titled
  const titleOk = listing.land?.checkedAt ? listing.land.titleStatus === 'registered' : listing.titled;

  return (
    <div className="wrap">
      <RecordView id={listing.id} />
      <JsonLd data={graph(listingLd(listing, agent.name), breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: DEAL_LABELS[listing.deal], path: `/listings?deal=${listing.deal}` },
        { name: listing.neighborhood, path: areaPath },
        { name: listing.title, path: `/listings/${listing.id}` },
      ]))} />
      {/* Не публічне (чернетка, перевірка, строк минув, приховане) відкривається лише автору й адміну */}
      {!lc.public && (
        <div className="lc-banner is-warn page-top" style={{ marginBottom: 0 }}>
          <Icon name="eye" size={18} />
          <div>
            <b>{t('Buyers can’t see this listing.')}</b>{' '}
            {lc.key === 'draft' ? t('It’s a draft.')
              : lc.key === 'pending' ? t('It’s waiting for a moderator’s check.')
                : lc.key === 'rejected' ? t('The moderator sent it back: {note}', { note: listing.reviewNote || '—' })
                  : lc.key === 'expired' ? t('Its 90 days are over. Renew it in your dashboard.')
                    : t('It’s unpublished.')}
          </div>
        </div>
      )}
      <div className="gallery-wrap page-top">
        <BackButton fallback={`/listings?deal=${listing.deal}`} />
        <Gallery photos={listing.photos} title={listing.title} />
      </div>

      <div className="prop">
        <div>
          <div className="prop__head">
            <div>
              <h1>{listing.title}</h1>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {listing.address && <>{listing.address} · </>}{listing.neighborhood}, {listing.island}, {t('Bay Islands')}
              </p>
              {listing.development && (
                <Link href={lp(`/developments/${listing.development.slug}`)} className="in-dev">
                  <Icon name="building" size={16} /> {t('Unit in')} <b>{listing.development.name}</b> · {t('see all units')}
                </Link>
              )}
            </div>
            <div className="prop__acts">
              <CompareButton listingId={listing.id} variant="page" />
              <div className="prop__fav"><FavButton listingId={listing.id} initial={favIds.includes(listing.id)} /></div>
            </div>
          </div>

          <div className="prop__price">
            {fmtPrice(listing.price, listing.deal, lang)}
            {listing.status !== 'available' && <span className={`unit-status unit-status--${listing.status}`}>{t(statusLabel(listing.status))}</span>}
            {listing.deal === 'sale' && listing.sqft > 0 && (
              <span className="muted small" style={{ fontWeight: 500 }}>
                {' '}· {fmtPerArea(listing.price, listing.sqft)}
              </span>
            )}
            {listing.hoa > 0 && (
              <span className="muted small" style={{ fontWeight: 500 }}> · {t('HOA')} {fmtUsd(listing.hoa)}{t('/mo')}</span>
            )}
          </div>
          <p className="prop__updated" title={t('Updated {date}', { date: fmtDate(listing.updatedAt, lang) })}>
            <Icon name="calendar" size={14} /> {t('Updated {ago} · listed {date}', { ago: updatedAgo, date: fmtDate(listing.createdAt, lang) })}
          </p>
          <ListingTools pdfHref={`/listings/${listing.id}/report`} land={isLand} />

          <div className="specs">
            {isLand ? (
              <>
                <div className="spec"><span className="muted small">{t('Lot size')}</span><b>{t('{n} ac', { n: listing.lotAcres })}</b></div>
                <div className="spec"><span className="muted small">{t('Frontage')}</span><b>{listing.oceanfront ? t('Oceanfront') : t('Inland')}</b></div>
                <div className="spec"><span className="muted small">{t('Title')}</span><b>{titleOk ? t('Free & clear') : t('Not confirmed')}</b></div>
                <div className="spec"><span className="muted small">{t('Type')}</span><b>{t(TYPE_LABELS[listing.type])}</b></div>
              </>
            ) : (
              <>
                <div className="spec"><span className="muted small">{t('Bedrooms')}</span>
                  <b>{listing.beds > 0 ? listing.beds : t('Studio')}</b></div>
                <div className="spec"><span className="muted small">{t('Bathrooms')}</span><b>{listing.baths || '—'}</b></div>
                <div className="spec"><span className="muted small">{t('Interior')}</span>
                  <b>{listing.sqft > 0 ? `${fmtNumber(sqftToM2(listing.sqft))} m²` : '—'}</b>
                  {listing.sqft > 0 && <span className="muted small">{fmtNumber(listing.sqft)} ft²</span>}</div>
                {inDevelopment ? (
                  <div className="spec"><span className="muted small">{t('Unit · floor')}</span>
                    <b>{listing.unitNo || '—'}{listing.floor !== null && ` · ${listing.floor}`}</b></div>
                ) : (
                  <div className="spec"><span className="muted small">{t('Built')}</span><b>{listing.year || '—'}</b></div>
                )}
              </>
            )}
          </div>

          <div className="chips">
            <span className="chip">{t(TYPE_LABELS[listing.type])}</span>
            <span className="chip">{t(DEAL_LABELS[listing.deal])}</span>
            {listing.oceanfront && <span className="chip"><Icon name="wave" size={16} /> {t('Oceanfront')}</span>}
            {titleOk && <span className="chip"><Icon name="deed" size={16} /> {t('Free & clear title')}</span>}
            {listing.lotAcres > 0 && !isLand && <span className="chip">{t('{n} ac lot', { n: listing.lotAcres })}</span>}
            {listing.tags.map((tag) => <span key={tag} className="chip">{t(tag)}</span>)}
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
                    <h3>{t('Land passport')}</h3>
                    <span className="muted small">
                      {checked
                        ? <>{t('Checked {date}', { date: fmtDay(land.checkedAt!, lang) })}{land.checkedBy && <> {t('by {name}', { name: land.checkedBy })}</>}</>
                        : t('Nobody has confirmed these details yet — ask the agent before you commit.')}
                    </span>
                  </div>
                  <span className={`land__score land__score--${r.tone}`}>
                    {t(r.label)}{checked && <small> · {r.score}/{r.of}</small>}
                  </span>
                </div>

                <h4 className="land__sub">{t('The lot in numbers')}</h4>
                <div className="land__stats">
                  {n.acres > 0 && (
                    <div className="land__stat">
                      <span className="land__k">{t('Size')}</span>
                      <b>{fmtNumber(n.sqm)} m²</b>
                      <span className="small muted">{t('{n} ac', { n: n.acres })} · {fmtNumber(n.sqft)} ft²</span>
                    </div>
                  )}
                  {n.perAcre > 0 && (
                    <div className="land__stat">
                      <span className="land__k">{t('Price per acre')}</span>
                      <b>{fmtUsd(Math.round(n.perAcre))}</b>
                      <span className="small muted">
                        {fmtUsd(Math.round(n.perSqm))}/m²
                        {n.benchmark && n.vsBenchmark !== null && (
                          <> · <span className={n.vsBenchmark > 10 ? 'land__up' : n.vsBenchmark < -10 ? 'land__down' : ''}>
                            {n.vsBenchmark === 0 ? t('at') : t(n.vsBenchmark > 0 ? '{n}% above' : '{n}% below', { n: Math.abs(n.vsBenchmark) })}
                          </span>{' '}{t('the {where} median of {price}/ac', { where: n.benchmark.where, price: fmtUsd(Math.round(n.benchmark.perAcre)) })}
                          {' '}({t('{n} lots', { n: n.benchmark.count })})</>
                        )}
                      </span>
                    </div>
                  )}
                  {n.closing && site.showPurchaseCosts && (
                    <div className="land__stat">
                      <span className="land__k">{t('Cost to buy')}</span>
                      <b>{fmtUsd(Math.round(n.closing.low))}–{fmtUsd(Math.round(n.closing.high))}</b>
                      <span className="small muted">
                        {t('Typical 4–5.5% closing costs: 1.5% transfer tax, attorney, notary, registration.')}{' '}
                        <a href="#costs">{t('How it adds up')}</a>
                      </span>
                    </div>
                  )}
                  {n.taxMax > 0 && (
                    <div className="land__stat">
                      <span className="land__k">{t('Property tax')}</span>
                      <b>{t('up to {price}/yr', { price: fmtUsd(Math.round(n.taxMax)) })}</b>
                      <span className="small muted">{t('0.25% of the cadastral value, which is usually below the asking price.')}</span>
                    </div>
                  )}
                  {n.foreign && (
                    <div className={`land__stat land__stat--${n.foreign === 'personal' ? 'ok' : 'warn'}`}>
                      <span className="land__k">{t('Foreign buyers')}</span>
                      <b>{n.foreign === 'personal' ? t('Can own in your name') : t('Needs a Honduran company')}</b>
                      <span className="small muted">
                        {n.foreign === 'personal'
                          ? t('Under the {n} m² limit for a foreigner’s home (Decree 90-90).', { n: fmtNumber(FOREIGN_LIMIT_SQM) })
                          : t('Over the {n} m² a foreigner can hold personally; larger lots are usually bought through a company.', { n: fmtNumber(FOREIGN_LIMIT_SQM) })}
                        {' '}<Link href={lp('/guides/can-foreigners-buy-property-in-roatan')}>{t('The 3,000 m² rule')}</Link>
                      </span>
                    </div>
                  )}
                  <div className="land__stat">
                    <span className="land__k">{t('Distances')}</span>
                    <ul className="land__dist">
                      {n.distances.map((d) => (
                        <li key={d.name}><span>{t(d.name)}</span><b>{d.km < 1 ? '<1' : d.km.toFixed(d.km < 10 ? 1 : 0)} km</b></li>
                      ))}
                    </ul>
                    <span className="tiny muted">{t('Straight line; roads are longer.')}</span>
                  </div>
                </div>

                <h4 className="land__sub">{t('Checked on the ground')}</h4>
                <div className="land__rows">
                  {LAND_FIELDS.map((f) => {
                    const value = checked ? land[f.key] : 'unknown';
                    const state = landState(f, value);
                    return (
                      <div key={f.key} className={`land__row land__row--${state}`}>
                        <span className="land__k">{t(f.label)}</span>
                        <span className="land__v">
                          {state === 'ok' && <Icon name="check" size={20} />}
                          {t(landLabel(f, value))}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="land__foot">
                  <a className="btn btn--ghost" href={lp(`/listings/${listing.id}/report`)} target="_blank" rel="noreferrer">
                    <Icon name="link" size={16} /> {t('Download land report (PDF)')}
                  </a>
                  <span className="tiny muted">
                    {t('“Ready to build” means title, road, electricity and water are all in place. Costs and limits are estimates from our guides, not legal advice: always verify the title at the Instituto de la Propiedad and check the numbers with your attorney before paying a deposit.')}
                  </span>
                </div>
              </section>
            );
          })()}

          {facts.length > 0 && (
            <section id="details">
              <h3 className="prop__h">{t('Details')}</h3>
              <ul className="pfacts">
                {facts.map(([icon, value, hint]) => (
                  <li key={`${icon}-${value}`}><Icon name={icon} size={22} /><span>{value}{hint && <small> · {hint}</small>}</span></li>
                ))}
              </ul>
            </section>
          )}

          {listing.text && (
            <>
              <h3 className="prop__h">{t('About this property')}</h3>
              <p className="muted" style={{ fontSize: 15 }}>{listing.text}</p>
            </>
          )}

          {listing.sourceName && (
            <p className="src">
              <Icon name="link" size={16} />
              <span>
                {t('Facts on this page come from')} <b>{listing.sourceName}</b>
                {listing.sourceRef && <> · {listing.sourceRef}</>}{t(', who hold the listing.')}
                {listing.sourceUrl && (
                  <>
                    {' '}
                    <a href={listing.sourceUrl} target="_blank" rel="noreferrer nofollow">{t('Open the original listing')}</a>
                  </>
                )}
              </span>
            </p>
          )}

          {inUnit.length > 0 && (
            <section id="in-unit">
              <h3 className="prop__h">{t('In the apartment')}</h3>
              <ul className="pfacts pfacts--4">
                {inUnit.map(([k, label, icon]) => <li key={k}><Icon name={icon} size={22} /><span>{t(label)}</span></li>)}
              </ul>
            </section>
          )}

          {/* Фототур — коли ріелтор позначив кімнати на фото; інакше лишається галерея вгорі */}
          <PhotoTour groups={photoTour(listing.photos, listing.photoRooms)} title={listing.title} />

          <section id="price-history">
            <h3 className="prop__h">{t('Price history')}</h3>
            <PriceHistory points={prices} deal={listing.deal} price={listing.price} since={listing.createdAt} />
          </section>

          {/* витрати на купівлю й розстрочка — для будь-якого продажу; у землі паспорт посилається сюди */}
          {/* кожну половину адмін вимикає окремо (Admin → Overview → Listing page) */}
          {listing.deal === 'sale' && listing.price > 0 && (site.showPurchaseCosts || site.showFinancing) && (
            <PurchaseCalculator price={listing.price} hoa={listing.hoa} ownerFinancing={listing.ownerFinancing}
              showCosts={site.showPurchaseCosts} showFinancing={site.showFinancing} />
          )}

          {/* Місця поблизости — їх додає ріелтор у формі; точки з координатами є й на карті нижче */}
          {listing.nearby.length > 0 && (
            <section className="nearby" id="nearby">
              <h3 className="prop__h">{t("What's nearby")}</h3>
              <ul className="nearby__list">
                {listing.nearby.map((p, i) => {
                  const dist = nearbyDistance(p, listing, lang);
                  return (
                    <li key={i} className="nearby__item">
                      <span className="nearby__name">
                        <b>{p.name}</b>
                        <span className="small muted">{t(categoryLabel(p.category))}</span>
                      </span>
                      {dist && <span className="nearby__dist">{dist}</span>}
                    </li>
                  );
                })}
              </ul>
              <p className="tiny muted" style={{ marginTop: 8 }}>
                {t('Added by the listing agent — check opening hours before you go.')}
              </p>
            </section>
          )}

          <h3 className="prop__h">{t('Location')}</h3>
          <div id="miniMap">
            <MapView items={[listing]} center={[listing.lat, listing.lng]} detail places={listing.nearby} />
          </div>

          {dev && (
            <section className="about-dev" id="building">
              <h3 className="prop__h">{t('About the building')}</h3>
              <p className="small" style={{ margin: '4px 0 12px', fontWeight: 600 }}>
                {building?.name ?? dev.name}{(building?.address || dev.address) && ` · ${building?.address || dev.address}`}
              </p>
              <PhotoStrip photos={building?.photo ? [building.photo, ...dev.photos.filter((p) => p !== building.photo)] : dev.photos}
                title={building?.name ?? dev.name} />
              <FeatureGrid items={buildingFacts} />
              {dev.amenities.length > 0 && (
                <ul className="pfacts pfacts--4 pfacts--building">
                  {dev.amenities.map((a) => <li key={a}><Icon name="check" size={20} /><span>{t(a)}</span></li>)}
                </ul>
              )}
            </section>
          )}

          {dev && docs.length > 0 && (
            <section id="documents">
              <h3 className="prop__h">{t('Documents')}</h3>
              <DevelopmentDocs docs={docs} />
            </section>
          )}

          {dev && (
            <section className="about-dev" id="development">
              <h3 className="prop__h">{t('About {name}', { name: dev.name })}</h3>
              <PhotoStrip photos={dev.photos} title={dev.name} />
              <FeatureGrid items={developmentFeatures(dev, devBuildings, devAll)} />
              <Link href={lp(`/developments/${dev.slug}`)} className="btn btn--ghost" style={{ marginTop: 16 }}>
                {t('Open {name}', { name: dev.name })} <Icon name="arrowRight" size={18} />
              </Link>
            </section>
          )}

          <p className="tiny muted" style={{ marginTop: 14 }}>
            {t('Listing ID {id} · listed {created} · updated {updated} · {views} views', {
              id: listing.id, created: fmtDate(listing.createdAt, lang), updated: fmtDate(listing.updatedAt, lang), views: fmtNumber(listing.views),
            })}
          </p>
        </div>

        <AgentContact agent={agent} agency={agency} listing={listing} listingUrl={`${SITE_URL}/listings/${listing.id}`}
          isFav={favIds.includes(listing.id)} sticky
          extra={premium ? (
            <p className="premium-agent small"><Icon name="verified" size={16} /> {t('Premium agent on Resoha')}</p>
          ) : undefined}
          me={me && me.role === 'user' ? { name: me.name, phone: me.phone, email: me.email } : null} />
      </div>

      {siblings.length > 0 && listing.development && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section__head">
            <div><h2>{t('Other units in {name}', { name: listing.development.name })}</h2></div>
            <Link className="btn btn--ghost" href={lp(`/developments/${listing.development.slug}`)}>{t('See all units')} <Icon name="arrowRight" size={18} /></Link>
          </div>
          <div className="grid grid--4">
            {siblings.map((l) => <ListingCard key={l.id} listing={l} isFav={favIds.includes(l.id)} />)}
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section__head"><div><h2>{premium
            ? t('More from {name}', { name: agent.name })
            : t('Similar listings near {place}', { place: listing.neighborhood })}</h2></div></div>
          <div className="grid grid--4">
            {similar.map((l) => <ListingCard key={l.id} listing={l} isFav={favIds.includes(l.id)} />)}
          </div>
        </section>
      )}

      <div className="crumbs crumbs--foot small muted">
        <Link href={lp('/')}>{t('Home')}</Link> ·{' '}
        <Link href={lp(`/listings?deal=${listing.deal}`)}>{t(DEAL_LABELS[listing.deal])}</Link> ·{' '}
        <Link href={areaPath}>{listing.neighborhood}</Link>
        {listing.development && <> · <Link href={lp(`/developments/${listing.development.slug}`)}>{listing.development.name}</Link></>}
      </div>
    </div>
  );
}

const isLandType = (t: string) => t === 'land';

/** «today», «yesterday», «5 days ago», «3 months ago» — як «Оновлено» у LUN */
function ago(iso: string, t: T) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return t('today');
  if (days === 1) return t('yesterday');
  if (days < 30) return t('{n} days ago', { n: days });
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? t('a month ago') : t('{n} months ago', { n: months });
  const years = Math.floor(months / 12);
  return years === 1 ? t('a year ago') : t('{n} years ago', { n: years });
}
