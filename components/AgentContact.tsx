'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import { toast } from './Toaster';
import { fmtPrice } from '@/lib/format';
import type { Agent, Listing } from '@/lib/types';
import Avatar from './Avatar';

export default function AgentContact({ agent, listing, listingUrl, me }: {
  agent: Agent; listing: Listing;
  /** Повна адреса сторінки обʼєкта — іде в текст повідомлення для WhatsApp */
  listingUrl: string;
  me?: { name: string; phone: string; email: string } | null;
}) {
  const [shown, setShown] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // коли картка зʼявилась: сервер відсіює «відправки» швидші за людину (lib/guard.ts)
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);

  // WhatsApp — основний канал на цьому ринку; форма нижче лишається запасним
  const wa = (agent.whatsapp || agent.phone).replace(/[^\d]/g, '');
  const waText = `Hi ${agent.name.split(' ')[0]}, I'm interested in "${listing.title}" `
    + `(${fmtPrice(listing.price, listing.deal)}) — ${listingUrl}`;
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(waText)}` : '';

  /** Розмова піде в месенджері; тут лишаємо відмітку, щоб ріелтор і платформа бачили звернення. */
  function noteWhatsApp() {
    fetch('/api/leads', {
      method: 'POST',
      keepalive: true,   // запит має пережити перехід у месенджер
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: listing.id, channel: 'whatsapp', ts: shownAt.current }),
    }).catch(() => {});
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSending(true);
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: listing.id,
        name: fd.get('name'), phone: fd.get('phone'),
        email: fd.get('email') || me?.email, message: fd.get('message'),
        website: fd.get('website'), ts: shownAt.current,
      }),
    });
    setSending(false);
    if (res.ok) { setSent(true); toast('Enquiry sent to the agent'); }
    else toast((await res.json().catch(() => ({}))).error ?? 'Something went wrong');
  }

  return (
    <aside className="agent-card">
      <div className="agent-card__top">
        <Link href={`/agents/${agent.id}`}>
          <Avatar src={agent.avatar} name={agent.name} />
        </Link>
        <div>
          <div style={{ fontWeight: 700 }}>
            <Link href={`/agents/${agent.id}`}>{agent.name}</Link>{' '}
            {agent.verified && (
              <Icon name="verified" size={16} className="ico ico--ok" aria-label="Licensed agent, ID verified" />
            )}
          </div>
          <div className="muted small">
            {agent.agencyId
              ? <Link className="link-accent" href={`/agency/${agent.agencyId}`}>{agent.agency}</Link>
              : agent.agency}
          </div>
          <div className="small" style={{ marginTop: 4 }}>
            {agent.reviews > 0 ? (
              <>
                <span className="rating"><Icon name="star" size={15} /> {agent.rating}</span>
                <span className="muted"> · {agent.reviews} {agent.reviews === 1 ? 'review' : 'reviews'}</span>
              </>
            ) : (
              <span className="muted">No reviews yet</span>
            )}
            {agent.experience > 0 && <span className="muted"> · {agent.experience} yrs on island</span>}
          </div>
        </div>
      </div>

      <p className="muted small" style={{ marginTop: 12 }}>{agent.about}</p>
      <p className="tiny muted">Speaks: {agent.languages.join(', ')}</p>

      {/* Оголошення зі стороннього джерела: показуємо, у кого воно насправді. */}
      {listing.sourceName && (
        <p className="src" style={{ marginTop: 14 }}>
          <Icon name="link" size={16} />
          <span>
            Held by <b>{listing.sourceName}</b>{listing.sourceRef && <> · {listing.sourceRef}</>}.
            {listing.sourceUrl && (
              <> <a href={listing.sourceUrl} target="_blank" rel="noreferrer nofollow">Original listing</a></>
            )}
          </span>
        </p>
      )}

      {waHref && (
        <a className="btn btn--wa btn--block btn--lg" style={{ marginTop: 14 }}
          href={waHref} target="_blank" rel="noreferrer" onClick={noteWhatsApp}>
          <Icon name="chat" size={18} /> Message on WhatsApp
        </a>
      )}

      {/* Телефон показуємо лише коли він справді є. */}
      {agent.phone && (shown ? (
        <>
          <div className="phone-box">{agent.phone}</div>
          {agent.email && <a className="btn btn--ghost btn--block" href={`mailto:${agent.email}`}>{agent.email}</a>}
        </>
      ) : (
        <button className={`btn btn--block ${waHref ? 'btn--ghost' : 'btn--primary btn--lg'}`}
          style={{ marginTop: waHref ? 8 : 14 }} onClick={() => setShown(true)}>
          <Icon name="phone" size={18} /> Show phone number
        </button>
      ))}

      <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '18px 0' }} />

      {sent ? (
        <div className="small note-ok">
          <Icon name="check" size={16} className="ico ico--ok" /> Sent. The agent sees your enquiry in their dashboard and will reply — most respond same day.
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 700 }}>{waHref ? 'Or leave your details' : 'Request a viewing'}</div>
          <input className="input" name="name" placeholder="Your name" defaultValue={me?.name ?? ''} required maxLength={120} />
          <input className="input" name="phone" placeholder="Phone / WhatsApp" defaultValue={me?.phone ?? ''} required maxLength={40} />
          <input className="input" name="email" type="email" placeholder="Email (optional)" defaultValue={me?.email ?? ''} maxLength={200} />
          <textarea className="input" name="message" rows={3} placeholder="When are you on the island?" maxLength={2000} />
          {/* приманка для ботів: людина цього поля не бачить і не заповнює */}
          <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <button className="btn btn--primary btn--block" disabled={sending}>
            {sending ? 'Sending…' : 'Send enquiry'}
          </button>
          <span className="tiny muted">
            By sending you agree to be contacted about this property.
            {me ? ' It will appear in your account under “My enquiries”.' : ''}
          </span>
        </form>
      )}
    </aside>
  );
}
