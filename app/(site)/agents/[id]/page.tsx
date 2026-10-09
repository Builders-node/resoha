import { cache } from 'react';
import type { Metadata } from 'next';
import { localized } from '@/lib/seoMeta';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BackButton from '@/components/BackButton';
import Icon from '@/components/Icon';
import AgentReviews from '@/components/AgentReviews';
import ListingCard from '@/components/ListingCard';
import { canReviewAgent, getAgency, getAgent, getFavorites, queryListings } from '@/lib/db';
import { nListings } from '@/lib/format';
import { getSession } from '@/lib/session';
import { getLang, getLp, getT } from '@/lib/i18n/server';
import { makeT } from '@/lib/i18n';
import { SITE_NAME } from '@/lib/site';
import Avatar from '@/components/Avatar';

const loadAgent = cache(getAgent);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const a = await loadAgent(id);
  if (!a) return { title: `Agent not found — ${SITE_NAME}` };
  return localized(`/agents/${a.id}`, {
    title: `${a.name} — ${a.agency || (await getT())('realtor')} | ${SITE_NAME}`,
    description: (a.about || `${a.name}, realtor on Roatán — listings and contacts.`).slice(0, 200),
  });
}

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const lp = await getLp();
  const { id } = await params;
  const agent = await loadAgent(id);
  if (!agent) notFound();

  const [agency, listings, session, lang] = await Promise.all([
    getAgency(agent.agencyId),
    queryListings({ agentId: agent.id, sort: 'new' }),
    getSession(),
    getLang(),
  ]);
  const t = makeT(lang);
  const [favIds, canReview] = await Promise.all([
    session ? getFavorites(session.id) : Promise.resolve([]),
    canReviewAgent(agent.id, session?.id ?? null),
  ]);

  const areas = [...new Set(listings.map((l) => l.neighborhood))];

  return (
    <div className="wrap">
      <div className="crumbs small muted"><BackButton variant="inline" fallback="/" /></div>

      <header className="org org--person">
        <Avatar className="org__avatar" src={agent.avatar} name={agent.name} />
        <div>
          <h1 className="with-ico">
            {agent.name}
            {agent.verified && <Icon name="verified" size={20} className="ico ico--ok" />}
          </h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {agency ? <Link className="link-accent" href={lp(`/agency/${agency.id}`)}>{agency.name}</Link> : t('Independent agent')}
            {agent.isOwner && <span className="pill pill--on" style={{ marginLeft: 8 }}>{t('Owner')}</span>}
          </p>
          {agent.about && <p className="org__about" style={{ color: 'var(--ink-2)' }}>{agent.about}</p>}
          <div className="org__contacts org__contacts--light">
            {/* Порожній телефон давав живу кнопку WhatsApp, що вела на wa.me без номера. */}
            {agent.phone && (
              <a href={`tel:${agent.phone.replace(/[^+\d]/g, '')}`}><Icon name="phone" size={16} /> {agent.phone}</a>
            )}
            {agent.whatsapp && (
              <a href={`https://wa.me/${agent.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">
                <Icon name="chat" size={16} /> WhatsApp
              </a>
            )}
            {!agent.phone && !agent.whatsapp && (
              <span className="muted small">{t('No phone on file — use the enquiry form on a listing')}</span>
            )}
            {agent.languages.length > 0 && <span className="muted small">{t('Speaks {langs}', { langs: agent.languages.join(', ') })}</span>}
          </div>
        </div>
      </header>

      <div className="stats" style={{ marginTop: 24 }}>
        <div className="stat"><span className="muted small">{t('Listings')}</span><b>{listings.length}</b></div>
        <div className="stat"><span className="muted small">{t('Years on island')}</span><b>{agent.experience || '—'}</b></div>
        <div className="stat">
          <span className="muted small">{t('Rating')}</span>
          <b>{agent.reviews > 0 ? `${agent.rating} / 5` : '—'}</b>
        </div>
        <div className="stat"><span className="muted small">{t('Areas')}</span><b>{areas.length}</b></div>
      </div>

      <section className="section" style={{ paddingTop: 32 }}>
        <div className="section__head">
          <h2>{nListings(listings.length, lang)}</h2>
          <Link className="btn btn--primary" href={lp(`/listings?agentId=${agent.id}`)}>
            {t('Open in search')} <Icon name="arrowRight" size={18} />
          </Link>
        </div>
        {listings.length === 0 ? (
          <div className="empty"><div className="empty__ico"><Icon name="home" size={40} /></div>{t('Nothing listed right now')}</div>
        ) : (
          <div className="grid grid--4">
            {listings.slice(0, 8).map((l) => (
              <ListingCard key={l.id} listing={l} isFav={favIds.includes(l.id)} />
            ))}
          </div>
        )}
      </section>

      <AgentReviews agentId={agent.id} canReview={canReview} signedIn={!!session}
        isSelf={session?.id === agent.id} />

      <div className="crumbs crumbs--foot small muted">
        <Link href={lp('/')}>{t('Home')}</Link> ·{' '}
        {agency ? <Link href={lp(`/agency/${agency.id}`)}>{agency.name}</Link> : t('Independent agent')} · {agent.name}
      </div>
    </div>
  );
}
