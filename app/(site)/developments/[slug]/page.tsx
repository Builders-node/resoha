import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import AgentContact from '@/components/AgentContact';
import BackButton from '@/components/BackButton';
import DevelopmentBuildings from '@/components/DevelopmentBuildings';
import DevelopmentChess from '@/components/DevelopmentChess';
import DevelopmentUnits from '@/components/DevelopmentUnits';
import JsonLd from '@/components/JsonLd';
import Photo from '@/components/Photo';
import { getAgent, getDevelopment, listBuildings, queryListings } from '@/lib/db';
import { fmtUsd } from '@/lib/format';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { currentUser } from '@/lib/session';
import { breadcrumbLd, graph } from '@/lib/seo';
import { areaForNeighborhood } from '@/lib/content/areas';
import { fromPrice, rentalsLabel, toM2 } from '@/lib/units';

const MapView = dynamic(() => import('@/components/MapView'));

// метадані й сама сторінка питають той самий ЖК — один запит на двох
const loadDevelopment = cache(getDevelopment);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await loadDevelopment(slug);
  if (!d) return { title: `Development not found — ${SITE_NAME}` };
  const title = `${d.name} — new development in ${d.neighborhood}, Roatán`;
  const description = (d.text || `${d.name}: apartments for sale and rent in ${d.neighborhood}, Roatán.`).slice(0, 200);
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: `/developments/${d.slug}` },
    openGraph: { title, description, url: `/developments/${d.slug}`, type: 'website', siteName: SITE_NAME, images: d.photos.slice(0, 1) },
  };
}

export default async function DevelopmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dev = await loadDevelopment(slug);
  if (!dev) notFound();

  const [agent, me, units, buildings] = await Promise.all([
    getAgent(dev.agentId),
    currentUser(),
    queryListings({ developmentId: dev.id, sort: 'price_asc' }),
    listBuildings(dev.id),
  ]);
  // Автор може бути прихованим (заблокований акаунт) — тоді й ЖК не показуємо
  if (!agent) notFound();

  const area = areaForNeighborhood(dev.neighborhood);
  const areaPath = area ? `/areas/${area.slug}` : `/listings?neighborhoods=${encodeURIComponent(dev.neighborhood)}`;

  const forSale = units.filter((u) => u.deal === 'sale');
  const from = fromPrice(forSale);
  const beds = units.map((u) => u.beds);
  const types = units.length
    ? [...new Set([Math.min(...beds), Math.max(...beds)])].map((b) => (b ? `${b} BR` : 'Studio')).join(' – ')
    : '—';
  const sizes = units.filter((u) => u.sqft > 0).map((u) => toM2(u.sqft));
  const floors = units.flatMap((u) => (u.floor !== null ? [u.floor] : []));
  // заявку з форми привʼязуємо до найдешевшої вільної квартири — лід завжди про конкретний обʼєкт
  const leadUnit = units.find((u) => u.status === 'available') ?? units[0];
  const url = `${SITE_URL}/developments/${dev.slug}`;
  const chessGroups = [
    ...buildings.map((b) => ({ id: b.id, name: b.name, units: units.filter((u) => u.buildingId === b.id) })),
    { id: '', name: 'Other units', units: units.filter((u) => !u.buildingId || !buildings.some((b) => b.id === u.buildingId)) },
  ].filter((g) => g.units.some((u) => u.floor !== null));
  // характеристики будинку: показуємо лише заповнене
  const facts: [string, string][] = [
    ['Developer', dev.developer],
    ['Completion', dev.completion],
    ['Floors', dev.floors ? String(dev.floors) : floors.length ? `${Math.min(...floors)}–${Math.max(...floors)}` : ''],
    ['Buildings', buildings.length > 1 ? String(buildings.length) : ''],
    ['Units', units.length ? String(units.length) : ''],
    ['Construction', dev.construction],
    ['Parking', dev.parking],
    ['HOA', dev.hoa !== null ? (dev.hoa ? `${fmtUsd(dev.hoa)}/mo` : 'None') : ''],
    ['Rentals', dev.rentals ? rentalsLabel(dev.rentals) : ''],
  ].filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <div className="wrap">
      <JsonLd data={graph(breadcrumbLd([
        { name: 'Home', path: '/' },
        { name: 'Developments', path: '/developments' },
        { name: dev.name, path: `/developments/${dev.slug}` },
      ]))} />
      <div className="crumbs small muted">
        <Link href="/">Home</Link> · <Link href="/developments">Developments</Link> · <Link href={areaPath}>{dev.neighborhood}</Link>
      </div>

      <div className="gallery-wrap">
        <BackButton fallback="/developments" />
        {dev.photos.length > 0 ? (
          <div className="gallery">
            {dev.photos.slice(0, 5).map((p, i) => (
              <Photo key={p} src={p} alt={`${dev.name} — photo ${i + 1}`} eager={i === 0} />
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
              <span className="dev__kicker">New development</span>
              <h1 style={{ fontSize: 30 }}>{dev.name}</h1>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {dev.address && <>{dev.address} · </>}{dev.neighborhood}, {dev.island}, Bay Islands
              </p>
            </div>
          </div>

          {from !== null && (
            <div className="prop__price">
              <span className="muted small" style={{ fontWeight: 500 }}>From </span>{fmtUsd(from)}
            </div>
          )}

          <div className="specs">
            <div className="spec"><span className="muted small">Units</span><b>{units.length || '—'}</b></div>
            <div className="spec"><span className="muted small">Types</span><b>{types}</b></div>
            <div className="spec"><span className="muted small">Sizes</span>
              <b>{sizes.length ? `${Math.round(Math.min(...sizes))} – ${Math.round(Math.max(...sizes))} m²` : '—'}</b></div>
            <div className="spec"><span className="muted small">{dev.completion ? 'Completion' : 'Floors'}</span>
              <b>{dev.completion || (floors.length ? `${Math.min(...floors)}–${Math.max(...floors)}` : '—')}</b></div>
          </div>

          <section className="dev" id="units">
            <h2 className="dev__title">Units &amp; prices</h2>
            <DevelopmentUnits units={units}
              buildings={buildings.length > 1 ? Object.fromEntries(buildings.map((b) => [b.id, b.name])) : undefined} developer={dev.developer} completion={dev.completion} sales={dev.sales}
              contactHref="#contact" />
            <ul className="dev__facts">
              {dev.website && (
                <li><a href={dev.website} target="_blank" rel="noopener noreferrer nofollow">
                  {dev.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a></li>
              )}
            </ul>
            <p className="tiny muted" style={{ marginTop: 8 }}>
              Prices from the developer&apos;s price list — ask the agent which units are still open.
            </p>
          </section>

          {buildings.length > 0 && (
            <section className="dev" id="buildings">
              <h2 className="dev__title">{buildings.length > 1 ? 'Buildings' : 'Construction status'}</h2>
              <DevelopmentBuildings buildings={buildings} units={units} fallbackPhoto={dev.photos[0] ?? ''} />
            </section>
          )}

          {units.some((u) => u.floor !== null) && (
            <section className="dev" id="floors">
              <h2 className="dev__title">Availability by floor</h2>
              {/* у кожного дому своя шахматка; квартири без дому — окремим блоком наприкінці */}
              {chessGroups.map((g) => (
                <div key={g.id} id={g.id ? `bld-${g.id}` : undefined} className="chess-group">
                  {chessGroups.length > 1 && <h3 className="chess-group__title">{g.name}</h3>}
                  <DevelopmentChess units={g.units} />
                </div>
              ))}
            </section>
          )}

          {(facts.length > 0 || dev.amenities.length > 0) && (
            <section className="dev">
              <h2 className="dev__title">The building</h2>
              <dl className="dev__specs">
                {facts.map(([k, v]) => <div key={k}><dt className="small muted">{k}</dt><dd>{v}</dd></div>)}
              </dl>
              {dev.amenities.length > 0 && (
                <ul className="dev__facts">{dev.amenities.map((a) => <li key={a}>{a}</li>)}</ul>
              )}
            </section>
          )}

          {dev.payment && (
            <section className="dev">
              <h2 className="dev__title">Payment plan</h2>
              <ol className="dev__pay">
                {dev.payment.split('\n').map((l) => l.trim()).filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}
              </ol>
              <p className="tiny muted" style={{ marginTop: 8 }}>Terms come from the developer — confirm the current plan with the agent.</p>
            </section>
          )}

          {dev.text && (
            <>
              <h3 style={{ marginTop: 26 }}>About {dev.name}</h3>
              <p className="muted" style={{ marginTop: 8, fontSize: 15.5, whiteSpace: 'pre-line' }}>{dev.text}</p>
            </>
          )}

          <h3 style={{ marginTop: 26, marginBottom: 12 }}>Location</h3>
          <div id="miniMap">
            <MapView items={[{ id: dev.id, lat: dev.lat, lng: dev.lng, price: from ?? 0, deal: 'sale' }]}
              center={[dev.lat, dev.lng]} detail />
          </div>
        </div>

        {leadUnit && (
          <AgentContact agent={agent} listing={leadUnit} listingUrl={url} topic={dev.name} fromPrice={from}
            me={me && me.role === 'user' ? { name: me.name, phone: me.phone, email: me.email } : null} />
        )}
      </div>
    </div>
  );
}
