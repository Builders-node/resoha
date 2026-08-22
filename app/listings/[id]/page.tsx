import Link from 'next/link';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import AgentContact from '@/components/AgentContact';
import FavButton from '@/components/FavButton';
import Icon from '@/components/Icon';
import ListingCard from '@/components/ListingCard';
import { bumpViews, getAgent, getFavorites, getListing, queryListings } from '@/lib/db';
import { DEAL_LABELS, TYPE_LABELS, fmtDate, fmtNumber, fmtPrice, fmtUsd, photoUrl } from '@/lib/format';
import { currentUser } from '@/lib/session';

const MapView = dynamic(() => import('@/components/MapView'));

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  await bumpViews(id);
  const agent = (await getAgent(listing.agentId))!;
  const me = await currentUser();
  const session = me;
  const favIds = session ? await getFavorites(session.id) : [];

  const similar = (await queryListings({ deal: listing.deal, neighborhoods: [listing.neighborhood] }))
    .filter((l) => l.id !== listing.id).slice(0, 4);

  const isLand = listing.type === 'land';

  return (
    <div className="wrap">
      <div className="crumbs small muted">
        <Link href="/">Home</Link> ·{' '}
        <Link href={`/listings?deal=${listing.deal}`}>{DEAL_LABELS[listing.deal]}</Link> ·{' '}
        <Link href={`/listings?neighborhoods=${encodeURIComponent(listing.neighborhood)}`}>{listing.neighborhood}</Link>
      </div>

      <div className="gallery">
        {listing.photos.slice(0, 5).map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p} src={photoUrl(p, i === 0 ? 1000 : 500, i === 0 ? 750 : 375)} alt={`${listing.title} — photo ${i + 1}`} />
        ))}
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
                <div className="spec"><span className="muted small">Title</span><b>{listing.titled ? 'Free & clear' : 'In process'}</b></div>
                <div className="spec"><span className="muted small">Type</span><b>{TYPE_LABELS[listing.type]}</b></div>
              </>
            ) : (
              <>
                <div className="spec"><span className="muted small">Bedrooms</span><b>{listing.beds}</b></div>
                <div className="spec"><span className="muted small">Bathrooms</span><b>{listing.baths}</b></div>
                <div className="spec"><span className="muted small">Interior</span><b>{fmtNumber(listing.sqft)} ft²</b></div>
                <div className="spec"><span className="muted small">Built</span><b>{listing.year || '—'}</b></div>
              </>
            )}
          </div>

          <div className="chips">
            <span className="chip">{TYPE_LABELS[listing.type]}</span>
            <span className="chip">{DEAL_LABELS[listing.deal]}</span>
            {listing.oceanfront && <span className="chip"><Icon name="wave" size={16} /> Oceanfront</span>}
            {listing.titled && <span className="chip"><Icon name="deed" size={16} /> Free &amp; clear title</span>}
            {listing.lotAcres > 0 && !isLand && <span className="chip">{listing.lotAcres} ac lot</span>}
            {listing.tags.map((t) => <span key={t} className="chip">{t}</span>)}
          </div>

          <h3 style={{ marginTop: 26 }}>About this property</h3>
          <p className="muted" style={{ marginTop: 8, fontSize: 15.5 }}>{listing.text}</p>

          <h3 style={{ marginTop: 26, marginBottom: 12 }}>Location</h3>
          <div id="miniMap">
            <MapView items={[listing]} zoom={14} center={[listing.lat, listing.lng]} interactive={false} />
          </div>

          <p className="tiny muted" style={{ marginTop: 14 }}>
            Listing ID {listing.id} · listed {fmtDate(listing.createdAt)} · {fmtNumber(listing.views)} views
          </p>
        </div>

        <AgentContact agent={agent} listing={listing}
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
