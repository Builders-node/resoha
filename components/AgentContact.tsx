'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from './Icon';
import FavButton from './FavButton';
import { toast } from './Toaster';
import { fmtPrice, fmtUsd } from '@/lib/format';
import { CONTACT_EMAIL } from '@/lib/site';
import type { Agency, Agent, Listing } from '@/lib/types';
import Avatar from './Avatar';

const digits = (v: string) => v.replace(/[^\d]/g, '');

/** Telegram приймає і @username, і номер телефону. */
function telegramHref(v: string) {
  const s = v.trim().replace(/^@/, '');
  if (!s) return '';
  return /^\+?[\d\s()-]+$/.test(s) ? `https://t.me/+${digits(s)}` : `https://t.me/${s}`;
}

/* Фірмові знаки месенджерів — залиті, на відміну від лінійних іконок Icon. */
const WhatsAppMark = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.3z" />
  </svg>
);
const ViberMark = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="M11.4 1.6c-2 0-6.2.3-8.5 2.4C1.2 5.7.6 8.2.5 11.3c-.1 3.1-.1 8.9 5.5 10.5v2.4s0 1 .6 1.2c.8.2 1.2-.5 1.9-1.3l1.3-1.5c3.8.3 6.7-.4 7-.5.8-.3 5.1-.8 5.8-6.5.7-5.9-.4-9.6-2.3-11.3C19.7 3.8 17.6 1.7 11.4 1.6zm.5 1.8c5.3.1 7.2 1.8 7.7 2.3 1.6 1.4 2.4 4.7 1.8 9.6-.6 4.7-4 5-4.6 5.2-.3.1-2.8.7-6.1.5l-3.3 3.6v-3.7c-4.6-1.3-4.5-6.1-4.4-8.6.1-2.6.6-4.7 2-6.1C7 4 10.5 3.4 11.9 3.4zm.3 2.6a.4.4 0 0 0 0 .8 5 5 0 0 1 5.1 5.3.4.4 0 1 0 .8 0 5.8 5.8 0 0 0-5.9-6.1zm-3.6.7a1 1 0 0 0-.6.2c-.6.5-1.2 1-1 1.8.1.5 1.4 3.6 4.4 6 1.8 1.4 3.5 2 4.4 2.3.7.2 1.4-.4 1.9-1 .3-.4.3-.9-.1-1.2l-1.8-1.3c-.4-.3-1-.2-1.2.1l-.5.7c-.2.3-.7.3-.7.3-3.2-.8-4-4-4-4s0-.5.3-.7l.7-.5c.3-.2.5-.8.2-1.2L9.3 7a.9.9 0 0 0-.7-.3zm4 .9a.4.4 0 0 0 0 .8 3.2 3.2 0 0 1 3.2 3.3.4.4 0 1 0 .8 0 4 4 0 0 0-4-4.1zm.3 1.6a.4.4 0 0 0 0 .8c.8.1 1.2.5 1.3 1.3a.4.4 0 1 0 .8-.1 2.1 2.1 0 0 0-2.1-2z" />
  </svg>
);
const TelegramMark = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
    <path d="M21.6 3.4 2.9 10.6c-1.3.5-1.3 1.2-.2 1.6l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.6.2 1.8-.8l3.2-15.2c.3-1.3-.5-1.9-1.8-1.6zM8.8 13.9l9.8-6.2c.5-.3.9-.1.5.2l-8.2 7.4-.3 3.4z" />
  </svg>
);

export default function AgentContact({ agent, agency, listing, listingUrl, isFav = false, me, topic, fromPrice, extra }: {
  agent: Agent; listing: Listing;
  /** Про що питають у месенджері, якщо не про сам обʼєкт — напр. про весь ЖК */
  topic?: string;
  /** Для ЖК: найнижча ціна серед квартир — показуємо «From» замість ціни одного юніта */
  fromPrice?: number | null;
  /** Агенція, від імені якої опубліковано обʼєкт, — для шапки картки */
  agency?: Agency | null;
  /** Повна адреса сторінки обʼєкта — для копіювання і тексту повідомлення в месенджері */
  listingUrl: string;
  isFav?: boolean;
  me?: { name: string; phone: string; email: string } | null;
  /** Додатковий блок під «Request a viewing» — напр. статус продажів ЖК */
  extra?: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // коли картка зʼявилась: сервер відсіює «відправки» швидші за людину (lib/guard.ts)
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);

  // картка ЖК стоїть на першій вільній квартирі, але говорить про весь будинок
  const forBuilding = topic !== undefined;
  const hasUnits = forBuilding;
  const price = forBuilding ? fromPrice ?? 0 : listing.price;
  const dropped = !hasUnits && listing.oldPrice > listing.price;
  const perSqft = !hasUnits && listing.deal === 'sale' && listing.sqft > 0
    ? `${fmtUsd(Math.round(listing.price / listing.sqft))}/ft²` : '';
  const place = [listing.address, listing.neighborhood].filter(Boolean).join(', ');

  const msg = `Hi ${agent.name.split(' ')[0]}, I'm interested in "${topic ?? listing.title}" `
    + `${topic ? '' : `(${fmtPrice(listing.price, listing.deal)}) `}— ${listingUrl}`;
  // WhatsApp — основний канал на цьому ринку; без окремого номера пробуємо звичайний телефон
  const wa = digits(agent.whatsapp || agent.phone);
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(msg)}` : '';
  const viberHref = agent.viber && digits(agent.viber) ? `viber://chat?number=%2B${digits(agent.viber)}` : '';
  const tgHref = agent.telegram ? telegramHref(agent.telegram) : '';
  const messengers = [
    waHref && { key: 'wa', href: waHref, label: 'WhatsApp', mark: <WhatsAppMark /> },
    viberHref && { key: 'viber', href: viberHref, label: 'Viber', mark: <ViberMark /> },
    tgHref && { key: 'tg', href: tgHref, label: 'Telegram', mark: <TelegramMark /> },
  ].filter(Boolean) as { key: string; href: string; label: string; mark: React.ReactNode }[];

  /** Розмова піде в месенджері; тут лишаємо відмітку, щоб ріелтор і платформа бачили звернення. */
  function noteWhatsApp() {
    fetch('/api/leads', {
      method: 'POST',
      keepalive: true,   // запит має пережити перехід у месенджер
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: listing.id, channel: 'whatsapp', ts: shownAt.current }),
    }).catch(() => {});
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(listingUrl);
      toast('Link copied');
    } catch {
      toast(listingUrl);
    }
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

  const reportHref = CONTACT_EMAIL
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Report listing ${listing.id}`)}`
      + `&body=${encodeURIComponent(`${listingUrl}\n\nWhat's wrong with this listing:\n`)}`
    : '';

  return (
    <aside className="cc-wrap" id="contact">
      <div className="cc">
        {agency && (
          <Link className="cc__brand" href={`/agency/${agency.id}`} style={{ background: agency.brand }}>
            <span>{agency.name}</span>
          </Link>
        )}

        <div className="cc__body">
          <div className="cc__top">
            <div className="cc__price">
              {price > 0 ? (
                <>
                  {hasUnits && <span className="cc__from">From</span>}
                  {fmtPrice(price, listing.deal)}
                </>
              ) : 'Price on request'}
              {dropped && <Icon name="arrowDown" size={26} className="ico cc__drop" aria-label="Price reduced" />}
            </div>
            <div className="cc__acts">
              <button className="cc__act" onClick={copyLink} aria-label="Copy link" title="Copy link">
                <Icon name="link" size={26} />
              </button>
              {!forBuilding && <FavButton listingId={listing.id} initial={isFav} className="cc__act cc__fav" size={26} />}
            </div>
          </div>

          {(dropped || perSqft) && (
            <div className="cc__sub">
              {dropped && <s className="cc__old">{fmtPrice(listing.oldPrice, listing.deal)}</s>}
              {perSqft && <span className="cc__per">{perSqft}</span>}
            </div>
          )}

          {place && <div className="cc__addr">{place}</div>}

          <div className="cc__agent">
            <Link href={`/agents/${agent.id}`}><Avatar src={agent.avatar} name={agent.name} /></Link>
            <div>
              <Link className="cc__name" href={`/agents/${agent.id}`}>{agent.name}</Link>
              {agent.agencyId
                ? <Link className="cc__org" href={`/agency/${agent.agencyId}`}>{agency?.name || agent.agency}</Link>
                : <span className="cc__org cc__org--plain">{agent.agency || 'Independent agent'}</span>}
            </div>
          </div>

          {agent.verified && (
            <div className="cc__verified">
              Verified agent
              <span className="cc__badge" title="Licence and ID checked by Resoha">
                <Icon name="check" size={14} strokeWidth={2.6} /> ID
              </span>
            </div>
          )}

          {agent.phone && (shown ? (
            <a className="cc__btn cc__btn--phone" href={`tel:+${digits(agent.phone)}`}>
              <Icon name="phone" size={22} /> {agent.phone}
            </a>
          ) : (
            <button className="cc__btn cc__btn--phone" onClick={() => setShown(true)}>
              <Icon name="phone" size={22} /> Show phone
            </button>
          ))}

          {messengers.length > 0 && (
            <div className={`cc__msgs ${messengers.length % 2 ? 'cc__msgs--odd' : ''}`}>
              {messengers.map((m, i) => (
                <a key={m.key} className={`cc__btn cc__btn--${m.key}`} href={m.href} target="_blank" rel="noreferrer"
                  onClick={m.key === 'wa' ? noteWhatsApp : undefined}>
                  {/* на пів ширини картки влазить лише назва месенджера */}
                  {m.mark} {messengers.length % 2 && i === 0 ? `Message on ${m.label}` : m.label}
                </a>
              ))}
            </div>
          )}

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
        </div>
      </div>

      <div className="cc__links">
        <button className="cc__link" onClick={() => setFormOpen((v) => !v)} aria-expanded={formOpen}>
          <Icon name="calendar" size={20} /> <span>Request a viewing</span>
        </button>
        {reportHref && (
          <a className="cc__link" href={reportHref}>
            <Icon name="flag" size={20} /> <span>Report listing</span>
          </a>
        )}
      </div>

      {formOpen && (
        <div className="cc cc__form" id="enquiry">
          {sent ? (
            <div className="small note-ok">
              <Icon name="check" size={16} className="ico ico--ok" /> Sent. The agent sees your enquiry in their dashboard and will reply — most respond same day.
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 700 }}>Request a viewing</div>
              <input className="input" name="name" placeholder="Your name" defaultValue={me?.name ?? ''} required maxLength={120} />
              <input className="input" name="phone" placeholder="Phone / WhatsApp" defaultValue={me?.phone ?? ''} required maxLength={40} />
              <input className="input" name="email" type="email" placeholder="Email (optional)" defaultValue={me?.email ?? ''} maxLength={200} />
              <textarea className="input" name="message" rows={3} placeholder="When are you on the island?" maxLength={2000}
                defaultValue={topic ? `Interested in ${topic}. ` : undefined} />
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
        </div>
      )}

      {extra}
    </aside>
  );
}
