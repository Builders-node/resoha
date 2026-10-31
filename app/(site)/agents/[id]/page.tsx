import { cache } from 'react';
import type { Metadata } from 'next';
import { localized, metaDescription } from '@/lib/seoMeta';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BackButton from '@/components/BackButton';
import Icon from '@/components/Icon';
import AgentReviews from '@/components/AgentReviews';
import AgentListings from '@/components/AgentListings';
import { TelegramMark, ViberMark, WhatsAppMark } from '@/components/AgentContact';
import { canReviewAgent, getAgency, getAgent, getFavorites, queryListings } from '@/lib/db';
import { telegramHref } from '@/lib/format';
import { getSession } from '@/lib/session';
import { getLang, getLp, getT } from '@/lib/i18n/server';
import { makeT } from '@/lib/i18n';
import { SITE_NAME } from '@/lib/site';
import Avatar from '@/components/Avatar';
import JsonLd from '@/components/JsonLd';
import { agentLd, graph } from '@/lib/seo';

const loadAgent = cache(getAgent);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const a = await loadAgent(id);
  if (!a) return { title: `Agent not found — ${SITE_NAME}` };
  const [t, lang] = await Promise.all([getT(), getLang()]);
  // «про себе» ріелтор пише англійською — на /es шаблон, а не англійський текст
  const about = lang === 'en' ? (a.about ?? '').trim() : '';
  return localized(`/agents/${a.id}`, {
    title: `${a.name} — ${a.agency || t('realtor')} | ${SITE_NAME}`,
    description: metaDescription(about.length >= 70 ? about : t('{name}, realtor on Roatán: listings and contact details.', { name: a.name })),
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

  const areas = [...new Set(listings.map((l) => l.neighborhood).filter(Boolean))];
  const forSale = listings.filter((l) => l.deal === 'sale').length;
  const since = agent.createdAt ? new Date(agent.createdAt).getFullYear() : 0;
  const digits = (v: string) => v.replace(/[^\d]/g, '');
  const tg = agent.telegram ? telegramHref(agent.telegram) : '';
  // Лише те, що відомо: порожні «—» замість років чи рейтингу виглядали як поламана сторінка.
  const facts = [
    { label: t('Listings'), value: listings.length },
    forSale > 0 && forSale < listings.length && { label: t('For sale'), value: forSale },
    forSale < listings.length && forSale > 0 && { label: t('For rent'), value: listings.length - forSale },
    agent.reviews > 0 && {
      label: t('Rating'),
      value: <>{agent.rating}<Icon name="star" size={18} className="agent-hero__star" /></>,
      note: t(agent.reviews === 1 ? '{n} review' : '{n} reviews', { n: agent.reviews }),
    },
    agent.experience > 0 && { label: t('Years of experience'), value: agent.experience },
    areas.length > 0 && (areas.length <= 2
      ? { label: t('Areas'), value: <span className="agent-hero__place">{areas.join(', ')}</span> }
      : { label: t('Areas'), value: areas.length }),
    // «з 2026» у 2026 році нічого не каже — показуємо, коли ріелтор тут хоча б з минулого року
    since > 2000 && since < new Date().getFullYear() && { label: t('On Hogarli since'), value: since },
  ].filter(Boolean) as { label: string; value: React.ReactNode; note?: string }[];

  return (
    <div className="wrap">
      <JsonLd data={graph(agentLd(agent, agency, areas))} />
      <div className="crumbs small muted"><BackButton variant="inline" fallback="/" /></div>

      <header className="agent-hero">
        <div className="agent-hero__main">
          <div className="agent-hero__ava">
            <Avatar className="org__avatar" src={agent.avatar} name={agent.name} />
            {agent.verified && <span className="agent-hero__badge" title={t('Verified')}><Icon name="verified" size={18} /></span>}
          </div>
          <div className="agent-hero__info">
            <span className="agent-hero__kicker">{t(agent.isOwner ? 'Owner' : 'Agent')}</span>
            <h1>{agent.name}</h1>
            <div className="agent-hero__meta">
              {agency
                ? <Link className="agent-hero__agency" href={lp(`/agency/${agency.id}`)}><Icon name="building" size={16} />{agency.name}</Link>
                : <span><Icon name="user" size={16} />{t('Independent agent')}</span>}
              {agent.languages.length > 0 && (
                <span><Icon name="chat" size={16} />{t('Speaks {langs}', { langs: agent.languages.join(', ') })}</span>
              )}
            </div>
            {agent.about && <p className="agent-hero__about">{agent.about}</p>}
            <div className="agent-hero__actions">
              {/* Порожній телефон давав живу кнопку WhatsApp, що вела на wa.me без номера. */}
              {agent.phone && (
                <a className="btn btn--primary" href={`tel:+${digits(agent.phone)}`}><Icon name="phone" size={18} /> {agent.phone}</a>
              )}
              {agent.whatsapp && digits(agent.whatsapp) && (
                <a className="btn btn--wa" href={`https://wa.me/${digits(agent.whatsapp)}`} target="_blank" rel="noreferrer">
                  <WhatsAppMark /> WhatsApp
                </a>
              )}
              {agent.viber && digits(agent.viber) && (
                <a className="btn btn--ghost" href={`viber://chat?number=%2B${digits(agent.viber)}`}><ViberMark /> Viber</a>
              )}
              {tg && <a className="btn btn--ghost" href={tg} target="_blank" rel="noreferrer"><TelegramMark /> Telegram</a>}
              {!agent.phone && !agent.whatsapp && !agent.viber && !tg && (
                <span className="muted small">{t('No phone on file — use the enquiry form on a listing')}</span>
              )}
            </div>
          </div>
        </div>

        <dl className="agent-hero__facts">
          {facts.map((f) => (
            <div key={f.label} className="agent-hero__fact">
              <dt>{f.label}</dt>
              <dd>{f.value}{f.note && <small>{f.note}</small>}</dd>
            </div>
          ))}
        </dl>
      </header>

      <AgentListings listings={listings} favIds={favIds} />

      <AgentReviews agentId={agent.id} canReview={canReview} signedIn={!!session}
        isSelf={session?.id === agent.id} />

      <div className="crumbs crumbs--foot small muted">
        <Link href={lp('/')}>{t('Home')}</Link> ·{' '}
        {agency ? <Link href={lp(`/agency/${agency.id}`)}>{agency.name}</Link> : t('Independent agent')} · {agent.name}
      </div>
    </div>
  );
}
