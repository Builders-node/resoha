import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/Icon';
import AgentReviews from '@/components/AgentReviews';
import ListingCard from '@/components/ListingCard';
import { getAgency, getAgent, getFavorites, queryListings } from '@/lib/db';
import { fmtNumber, fmtUsd, nListings } from '@/lib/format';
import { getSession } from '@/lib/session';

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) notFound();

  const [agency, listings, session] = await Promise.all([
    getAgency(agent.agencyId),
    queryListings({ agentId: agent.id, sort: 'new' }),
    getSession(),
  ]);
  const favIds = session ? await getFavorites(session.id) : [];

  const cheapest = listings.filter((l) => l.deal === 'sale').sort((a, b) => a.price - b.price)[0];
  const areas = [...new Set(listings.map((l) => l.neighborhood))];

  return (
    <div className="wrap">
      <div className="crumbs small muted">
        <Link href="/">Home</Link> ·{' '}
        {agency ? <Link href={`/agency/${agency.id}`}>{agency.name}</Link> : 'Independent agent'} · {agent.name}
      </div>

      <header className="org org--person">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="org__avatar" src={agent.avatar} alt={agent.name} />
        <div>
          <h1 className="with-ico">
            {agent.name}
            {agent.verified && <Icon name="verified" size={20} className="ico ico--ok" />}
          </h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {agency ? <Link className="link-accent" href={`/agency/${agency.id}`}>{agency.name}</Link> : 'Independent agent'}
            {agent.isOwner && <span className="pill pill--on" style={{ marginLeft: 8 }}>Owner</span>}
          </p>
          {agent.about && <p className="org__about" style={{ color: 'var(--ink-2)' }}>{agent.about}</p>}
          <div className="org__contacts org__contacts--light">
            <a href={`tel:${agent.phone.replace(/[^+\d]/g, '')}`}><Icon name="phone" size={16} /> {agent.phone}</a>
            <a href={`https://wa.me/${agent.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">
              <Icon name="chat" size={16} /> WhatsApp
            </a>
            {agent.languages.length > 0 && <span className="muted small">Speaks {agent.languages.join(', ')}</span>}
          </div>
        </div>
      </header>

      <div className="stats" style={{ marginTop: 22 }}>
        <div className="stat"><span className="muted small">Listings</span><b>{listings.length}</b></div>
        <div className="stat"><span className="muted small">Years on island</span><b>{agent.experience || '—'}</b></div>
        <div className="stat">
          <span className="muted small">Rating</span>
          <b>{agent.reviews > 0 ? `${agent.rating} / 5` : '—'}</b>
        </div>
        <div className="stat"><span className="muted small">Areas</span><b>{areas.length}</b></div>
      </div>

      <section className="section" style={{ paddingTop: 30 }}>
        <div className="section__head">
          <h2>{nListings(listings.length)}</h2>
          <Link className="btn btn--primary" href={`/listings?agentId=${agent.id}`}>
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

      <AgentReviews agentId={agent.id} canReview={!!session} isSelf={session?.id === agent.id} />
    </div>
  );
}
