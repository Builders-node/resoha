import type { Metadata } from 'next';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import BackButton from '@/components/BackButton';
import DevelopmentBuildings from '@/components/DevelopmentBuildings';
import DevelopmentChess from '@/components/DevelopmentChess';
import DevelopmentSalesOffice from '@/components/DevelopmentSalesOffice';
import DevelopmentShell from '@/components/DevelopmentShell';
import DevelopmentUnits from '@/components/DevelopmentUnits';
import Gallery from '@/components/Gallery';
import Icon from '@/components/Icon';
import { FeatureGrid, developmentFeatures } from '@/components/DevelopmentFeatures';
import { ProgressPhotos } from '@/components/DevelopmentProgress';
import { trackAfterResponse } from '@/lib/track';
import { trackPromo } from '@/lib/promo';
import { developmentContext, developmentMetadata } from '@/lib/developmentPage';
import { fmtDay, fmtMonth, toM2 } from '@/lib/units';
import { fmtNumber } from '@/lib/format';

const MapView = dynamic(() => import('@/components/MapView'));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return developmentMetadata((await params).slug);
}

export default async function DevelopmentPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ utm_source?: string }>;
}) {
  const { slug } = await params;
  const ctx = await developmentContext(slug);
  const { dev, units, buildings, docs, progress, news, base, from } = ctx;
  await trackAfterResponse({ developmentId: dev.id }, 'dev_view', { utm: (await searchParams).utm_source });
  await trackPromo('development', [dev], 'click');

  const beds = units.map((u) => u.beds);
  const types = units.length
    ? [...new Set([Math.min(...beds), Math.max(...beds)])].map((b) => (b ? `${b} BR` : 'Studio')).join(' – ')
    : '—';
  const sizes = units.filter((u) => u.sqft > 0).map((u) => u.sqft);
  const floors = units.flatMap((u) => (u.floor !== null ? [u.floor] : []));
  const chessGroups = [
    ...buildings.map((b) => ({ id: b.id, name: b.name, units: units.filter((u) => u.buildingId === b.id) })),
    { id: '', name: 'Other units', units: units.filter((u) => !u.buildingId || !buildings.some((b) => b.id === u.buildingId)) },
  ].filter((g) => g.units.some((u) => u.floor !== null));
  // характеристики будинку: показуємо лише заповнене
  const facts = developmentFeatures(dev, buildings, units);
  const latest = progress.find((p) => p.photos.length);

  return (
    <DevelopmentShell ctx={ctx} active="overview" top={(
      <div className="gallery-wrap page-top">
        <BackButton fallback="/developments" />
        <Gallery photos={dev.photos} title={dev.name} />
      </div>
    )}>
      <div className="specs" style={{ marginTop: 0 }}>
        <div className="spec"><span className="muted small">Units</span><b>{units.length || '—'}</b></div>
        <div className="spec"><span className="muted small">Types</span><b>{types}</b></div>
        <div className="spec"><span className="muted small">Sizes</span>
          <b>{sizes.length ? `${Math.round(toM2(Math.min(...sizes)))} – ${Math.round(toM2(Math.max(...sizes)))} m²` : '—'}</b>
          {sizes.length > 0 && <span className="muted small">{fmtNumber(Math.min(...sizes))} – {fmtNumber(Math.max(...sizes))} ft²</span>}</div>
        <div className="spec"><span className="muted small">{dev.completion ? 'Completion' : 'Floors'}</span>
          <b>{dev.completion || (floors.length ? `${Math.min(...floors)}–${Math.max(...floors)}` : '—')}</b></div>
      </div>

      <section className="dev" id="units">
        <div className="dev__head">
          <h2 className="dev__title">Units &amp; prices</h2>
          {units.length > 0 && <Link className="dev__more" href={`${base}/layouts`}>Layouts →</Link>}
        </div>
        <DevelopmentUnits units={units}
          buildings={buildings.length > 1 ? Object.fromEntries(buildings.map((b) => [b.id, b.name])) : undefined} developer={dev.developer} developerHref={dev.developerId ? `/developers/${dev.developerId}` : undefined} completion={dev.completion} sales={dev.sales}
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
          <div className="dev__head">
            <h2 className="dev__title">{buildings.length > 1 ? 'Buildings' : 'Construction status'}</h2>
            <Link className="dev__more" href={`${base}/construction`}>Construction progress →</Link>
          </div>
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
        <section className="dev" id="features">
          <h2 className="dev__title">Project features</h2>
          <p className="small muted" style={{ margin: '-6px 0 16px' }}>As stated by the developer.</p>
          <FeatureGrid items={facts} />
          {dev.amenities.length > 0 && (
            <ul className="dev__facts" style={{ marginTop: 16 }}>{dev.amenities.map((a) => <li key={a}>{a}</li>)}</ul>
          )}
        </section>
      )}

      {latest && (
        <section className="dev">
          <div className="dev__head">
            <h2 className="dev__title">Construction progress</h2>
            <Link className="dev__more" href={`${base}/construction`}>All updates →</Link>
          </div>
          <p className="small muted" style={{ margin: '-6px 0 12px' }}>
            {fmtMonth(latest.month)}{latest.buildingId && buildings.length > 1 ? ` · ${buildings.find((b) => b.id === latest.buildingId)?.name ?? ''}` : ''}
          </p>
          <ProgressPhotos photos={latest.photos} max={4} title={`${dev.name}, ${fmtMonth(latest.month)}`} />
        </section>
      )}

      {(dev.video || dev.tour) && (
        <section className="dev">
          <Link className="dteaser" href={`${base}/tour`}>
            <Icon name={dev.tour ? 'orbit' : 'play'} size={28} />
            <span><b>{dev.tour ? 'Video & 360° tour' : 'Video'}</b><span className="small muted">Walk around {dev.name} without leaving home</span></span>
            <Icon name="arrowRight" size={20} />
          </Link>
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

      {docs.length > 0 && (
        <section className="dev">
          <div className="dev__head">
            <h2 className="dev__title">Documents</h2>
            <Link className="dev__more" href={`${base}/documents`}>All {docs.length} →</Link>
          </div>
          <ul className="dteaser-list">
            {docs.slice(0, 4).map((d) => (
              <li key={d.id}><Icon name="deed" size={18} /> <span>{d.title}</span>
                {d.verified && <span className="docs__ok tiny"><Icon name="check" size={13} strokeWidth={2.6} /> Checked</span>}</li>
            ))}
          </ul>
        </section>
      )}

      {news.length > 0 && (
        <section className="dev">
          <div className="dev__head">
            <h2 className="dev__title">News</h2>
            <Link className="dev__more" href={`${base}/news`}>All news →</Link>
          </div>
          <ul className="dteaser-list">
            {news.slice(0, 3).map((n) => (
              <li key={n.id}><span className="small muted" style={{ minWidth: 110 }}>{fmtDay(n.publishedOn)}</span>
                <Link href={`${base}/news#n-${n.id}`}>{n.title}</Link></li>
            ))}
          </ul>
        </section>
      )}

      <DevelopmentSalesOffice ctx={ctx} />

      {dev.text && (
        <>
          <h3 style={{ marginTop: 28 }}>About {dev.name}</h3>
          <p className="muted" style={{ marginTop: 8, fontSize: 16, whiteSpace: 'pre-line' }}>{dev.text}</p>
        </>
      )}

      <h3 style={{ marginTop: 28, marginBottom: 12 }}>Location</h3>
      <div id="miniMap">
        <MapView items={[{ id: dev.id, lat: dev.lat, lng: dev.lng, price: from ?? 0, deal: 'sale' }]}
          center={[dev.lat, dev.lng]} detail />
      </div>
    </DevelopmentShell>
  );
}
