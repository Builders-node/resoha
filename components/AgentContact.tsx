'use client';
import { useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import { toast } from './Toaster';
import type { Agent, Listing } from '@/lib/types';

export default function AgentContact({ agent, listing, me }: {
  agent: Agent; listing: Listing; me?: { name: string; phone: string; email: string } | null;
}) {
  const [shown, setShown] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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
      }),
    });
    setSending(false);
    if (res.ok) { setSent(true); toast('Enquiry sent to the agent'); }
    else toast((await res.json()).error ?? 'Something went wrong');
  }

  return (
    <aside className="agent-card">
      <div className="agent-card__top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Link href={`/agents/${agent.id}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={agent.avatar} alt={agent.name} />
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

      {shown ? (
        <>
          <div className="phone-box">{agent.phone}</div>
          <a className="btn btn--ghost btn--block" style={{ marginBottom: 8 }}
             href={`https://wa.me/${agent.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">
            <Icon name="chat" size={17} /> WhatsApp
          </a>
          <a className="btn btn--ghost btn--block" href={`mailto:${agent.email}`}>{agent.email}</a>
        </>
      ) : (
        <button className="btn btn--primary btn--block btn--lg" style={{ marginTop: 14 }} onClick={() => setShown(true)}>
          <Icon name="phone" size={18} /> Show phone &amp; WhatsApp
        </button>
      )}

      <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '18px 0' }} />

      {sent ? (
        <div className="small note-ok">
          <Icon name="check" size={16} className="ico ico--ok" /> Sent. The agent sees your enquiry in their dashboard and will reply — most respond same day.
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
          <div style={{ fontWeight: 700 }}>Request a viewing</div>
          <input className="input" name="name" placeholder="Your name" defaultValue={me?.name ?? ''} required />
          <input className="input" name="phone" placeholder="Phone / WhatsApp" defaultValue={me?.phone ?? ''} required />
          <input className="input" name="email" type="email" placeholder="Email (optional)" defaultValue={me?.email ?? ''} />
          <textarea className="input" name="message" rows={3} placeholder="When are you on the island?" />
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
