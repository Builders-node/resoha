import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import ListingCard from '@/components/ListingCard';
import { agencyMembers, getAgency, getFavorites, queryListings } from '@/lib/db';
import { fmtNumber, fmtUsd, nListings } from '@/lib/format';
import { getSession } from '@/lib/session';

export default async function AgencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agency = await getAgency(id);
  if (!agency) notFound();

  const [team, listings, session] = await Promise.all([
    agencyMembers(agency.id),
    queryListings({ agencyId: agency.id, sort: 'new' }),
    getSession(),
  ]);
  const favIds = session ? await getFavorites(session.id) : [];

  const cheapest = listings.filter((l) => l.deal === 'sale').sort((a, b) => a.price - b.price)[0];
  const views = listings.reduce((s, l) => s + l.views, 0);
  const areas = [...new Set(listings.map((l) => l.neighborhood))];

  return (
    <div className="wrap">
      <div className="crumbs small muted">
        <Link href="/">Home</Link> · <Link href="/listings?deal=sale">Agencies</Link> · {agency.name}
      </div>

      <header className="org" style={{ background: agency.brand }}>
        <div className="org__mono">{agency.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</div>
        <div>
          <h1 className="with-ico">
            {agency.name}
            {agency.verified && <Icon name="verified" size={20} className="ico ico--ok" />}
          </h1>
          <p className="org__about">{agency.about || 'Roatán real-estate agency on Resoha.'}</p>
          <div className="org__contacts">
            {agency.phone && <a href={`tel:${agency.phone.replace(/[^+\d]/g, '')}`}><Icon name="phone" size={16} /> {agency.phone}</a>}
            {agency.email && <a href={`mailto:${agency.email}`}><Icon name="inbox" size={16} /> {agency.email}</a>}
            {agency.phone && (
              <a href={`https://wa.me/${agency.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">
                <Icon name="chat" size={16} /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </header>

      <div className="stats" style={{ marginTop: 22 }}>
        <div className="stat"><span className="muted small">Listings</span><b>{listings.length}</b></div>
        <div className="stat"><span className="muted small">Agents</span><b>{team.length}</b></div>
        <div className="stat"><span className="muted small">Areas covered</span><b>{areas.length}</b></div>
        <div className="stat">
          <span className="muted small">{cheapest ? 'From' : 'Views'}</span>
          <b>{cheapest ? fmtUsd(cheapest.price) : fmtNumber(views)}</b>
        </div>
      </div>

      <section className="section" style={{ paddingTop: 30 }}>
        <div className="section__head"><h2>The team</h2></div>
        <div className="grid grid--4">
          {team.map((m) => (
            <Link key={m.id} className="person" href={`/agents/${m.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.avatar} alt={m.name} />
              <div>
                <div className="person__name with-ico">
                  {m.name}
                  {m.verified && <Icon name="verified" size={15} className="ico ico--ok" />}
                </div>
                <div className="muted small">{m.isOwner ? 'Owner' : 'Agent'}{m.experience ? ` · ${m.experience} yrs on island` : ''}</div>
                {m.languages.length > 0 && <div className="tiny muted">Speaks {m.languages.join(', ')}</div>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section__head">
          <h2>{nListings(listings.length)}</h2>
          <Link className="btn btn--primary" href={`/listings?agencyId=${agency.id}`}>
            Open in search <Icon name="arrowRight" size={18} />
          </Link>
        </div>
        {listings.length === 0 ? (
          <div className="empty"><div className="empty__ico"><Icon name="home" size={40} /></div>Nothing listed right now</div>
        ) : (
          <div className="grid grid--4">
            {listings.slice(0, 8).map((l) => (
              <ListingCard key={l.id} listing={l} isFav={favIds.includes(l.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
