import { SITE_NAME, SITE_URL } from '../site';
import { fmtVisit } from '../visits';

/**
 * Тексти сповіщень. Один шаблон дає і лист (HTML + текст), і коротке повідомлення в Telegram.
 * Дані приходять знімком із черги (див. міграцію 0050), тож шаблон нічого не догружає.
 */

export type Card = {
  id: string; title: string; price: number; deal: 'sale' | 'rent'; type?: string;
  neighborhood?: string; photo?: string; development?: string; developmentSlug?: string;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Payload = Record<string, any>;
export type Message = { subject: string; html: string; text: string; telegram: string };

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const price = (c: Card) => `${usd.format(Number(c.price) || 0)}${c.deal === 'rent' ? '/mo' : ''}`;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (ch) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
const listingUrl = (c: Card) => `${SITE_URL}/listings/${c.id}`;
const dashboard = `${SITE_URL}/agent`;
const when = (iso: string) => `${fmtVisit(iso)} (Roatán time)`;
const dateOnly = (iso: string) => new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

const CHANNEL: Record<string, string> = { form: 'Enquiry form', visit: 'Sales office visit', whatsapp: 'WhatsApp' };
const REASONS: Record<string, string> = {
  sold: 'Already sold or rented', wrong_price: 'Wrong price', wrong_info: 'Wrong details or location',
  photos: 'Photos don’t match', scam: 'Looks like a scam', duplicate: 'Duplicate listing', other: 'Something else',
};

/** Картка обʼєкта в листі: фото, назва, ціна, кнопка */
function cardHtml(c: Card, cta = 'Open listing') {
  const photo = c.photo && /^https?:\/\//.test(c.photo)
    ? `<img src="${esc(c.photo)}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:12px;margin:0 0 12px">`
    : '';
  const sub = [c.development, c.neighborhood].filter(Boolean).map(esc).join(' · ');
  return `<div style="border:1px solid #eee;border-radius:16px;padding:16px;margin:16px 0">${photo}`
    + `<div style="font-weight:700;font-size:16px">${esc(c.title)}</div>`
    + (sub ? `<div style="color:#777;font-size:13px;margin-top:2px">${sub}</div>` : '')
    + `<div style="font-weight:800;font-size:18px;margin:8px 0 12px">${esc(price(c))}</div>`
    + button(listingUrl(c), cta) + '</div>';
}

const button = (href: string, label: string) =>
  `<a href="${esc(href)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:10px">${esc(label)}</a>`;

const rows = (pairs: [string, unknown][]) => pairs.filter(([, v]) => v !== undefined && v !== null && String(v) !== '')
  .map(([k, v]) => `<tr><td style="color:#777;padding:4px 16px 4px 0;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`)
  .join('');

function layout(body: string, footer: string) {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f6;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111">`
    + `<div style="max-width:560px;margin:0 auto;padding:24px 16px">`
    + `<div style="font-weight:800;font-size:18px;margin-bottom:16px">${esc(SITE_NAME)}</div>`
    + `<div style="background:#fff;border-radius:16px;padding:24px;font-size:15px;line-height:1.5">${body}</div>`
    + `<div style="color:#999;font-size:12px;margin-top:16px;line-height:1.5">${footer}</div>`
    + `</div></body></html>`;
}

/** Підвал: чому прийшов лист і як відписатись (для листів, на які людина підписалась) */
function footer(kind: 'agent' | 'alerts' | 'transactional', unsub?: string | null) {
  const base = kind === 'agent'
    ? 'You get this because you list properties on Resoha. Change notifications in your dashboard → Profile.'
    : kind === 'alerts'
      ? 'You get this because you saved a search or a listing on Resoha.'
      : 'You get this because you contacted an agent on Resoha.';
  const link = unsub && kind !== 'transactional'
    ? ` <a href="${esc(`${SITE_URL}/unsubscribe?t=${unsub}&what=${kind === 'agent' ? 'leads' : 'alerts'}`)}" style="color:#999">Unsubscribe</a>`
    : '';
  return esc(base) + link;
}

const plain = (lines: (string | false | undefined | null)[]) => lines.filter(Boolean).join('\n');

export function render(kind: string, p: Payload, unsub?: string | null): Message | null {
  switch (kind) {
    case 'lead_agent': {
      const c = p.listing as Card;
      const visit = p.channel === 'visit' && p.visitAt;
      const subject = visit ? `Visit booked: ${p.name} · ${fmtVisit(p.visitAt)}` : `New enquiry: ${c.title}`;
      const details: [string, unknown][] = [
        ['From', p.name], ['Phone', p.phone], ['Email', p.email], ['Channel', CHANNEL[p.channel] ?? p.channel],
        ['Visit', visit ? when(p.visitAt) : ''], ['Interested in', (p.interests ?? []).join(', ')],
        ['Prefers', p.contactVia], ['Message', p.message],
      ];
      return {
        subject,
        html: layout(`<p style="margin:0 0 12px"><b>${visit ? 'A buyer booked a visit to your sales office.' : 'A buyer sent an enquiry.'}</b> Reply quickly: most buyers contact two or three agents.</p>`
          + `<table style="border-collapse:collapse;font-size:14px">${rows(details)}</table>`
          + cardHtml(c, 'Open listing') + button(dashboard, 'Open enquiries'), footer('agent', unsub)),
        text: plain([subject, '', ...details.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), '', listingUrl(c), dashboard]),
        telegram: plain([visit ? 'Visit booked' : 'New enquiry', c.title, `${p.name} · ${p.phone}`,
          p.email, visit && when(p.visitAt), p.message && `“${String(p.message).slice(0, 300)}”`, listingUrl(c)]),
      };
    }
    case 'lead_receipt': {
      const c = p.listing as Card;
      const visit = p.channel === 'visit' && p.visitAt;
      const a = p.agent ?? {};
      // підписка на новини ЖК — теж заявка (див. developments/[id]/subscribe), але лист інший
      const subscribed = /^Subscribed to /.test(String(p.message ?? ''));
      const subject = visit ? `Your visit is booked: ${fmtVisit(p.visitAt)}`
        : subscribed ? `You’re subscribed to ${c.development || c.title} updates` : `We sent your enquiry: ${c.title}`;
      const contacts: [string, unknown][] = [['Agent', a.name], ['Phone', a.phone], ['WhatsApp', a.whatsapp], ['Visit', visit ? when(p.visitAt) : '']];
      const manage = visit && p.manageToken ? manageUrl(p.manageToken) : '';
      return {
        subject,
        html: layout(`<p style="margin:0 0 12px">Hi ${esc(p.name)},</p><p style="margin:0 0 12px">`
          + (visit ? 'Your visit to the sales office is booked. The sales team will confirm it with you.'
            : subscribed ? 'The sales team will write to you about price changes, offers and construction progress.'
              : 'Your enquiry went straight to the listing agent. Most agents reply the same day.')
          + `</p><table style="border-collapse:collapse;font-size:14px">${rows(contacts)}</table>`
          + (manage ? `<p style="margin:16px 0 0">${button(manage, 'Change or cancel the visit')}</p>` : '')
          + cardHtml(c, 'View the property'), footer('transactional')),
        text: plain([subject, '', ...contacts.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), '',
          manage && `Change or cancel: ${manage}`, listingUrl(c)]),
        telegram: '',
      };
    }
    case 'visit_reminder_agent':
    case 'visit_reminder':
      return visitMessage(kind === 'visit_reminder_agent', p, unsub);
    case 'agency_invite': {
      const role = ROLE_NAMES[p.role] ?? 'agent';
      const url = `${SITE_URL}/invite/${p.token}`;
      const subject = `${p.inviter || 'A colleague'} invited you to ${p.agency} on ${SITE_NAME}`;
      const body = `${p.inviter || 'A colleague'} invited you to join ${p.agency} as ${role}. `
        + 'Accept the invitation with your agent account (or create one with this email) — the link works for 14 days.';
      return {
        subject,
        html: layout(`<p style="margin:0 0 12px">${esc(body)}</p><p style="margin:0 0 12px">${button(url, 'Accept the invitation')}</p>`
          + `<p style="margin:0;color:#777;font-size:13px">If you didn’t expect this, ignore this email.</p>`,
          esc('You get this because someone invited this email address to their agency on Resoha.')),
        text: plain([subject, '', body, url]),
        telegram: '',
      };
    }
    case 'price_drop': {
      const c = p as unknown as Card;
      const was = Number(p.oldPrice) || 0;
      const pct = was > 0 ? Math.round((1 - Number(c.price) / was) * 100) : 0;
      const subject = `Price drop${pct > 0 ? ` −${pct}%` : ''}: ${c.title}`;
      return {
        subject,
        html: layout(`<p style="margin:0 0 12px">A property you saved is now cheaper: <s style="color:#999">${esc(usd.format(was))}</s> → <b>${esc(price(c))}</b>.</p>${cardHtml(c)}`,
          footer('alerts', unsub)),
        text: plain([subject, `${usd.format(was)} → ${price(c)}`, listingUrl(c)]),
        telegram: '',
      };
    }
    case 'saved_search': {
      const items = (p.items ?? []) as Card[];
      const more = Math.max(0, Number(p.count) - items.length);
      const url = `${SITE_URL}/listings${p.query ? `?${p.query}` : ''}`;
      const subject = `${p.count} new ${p.count === 1 ? 'property' : 'properties'} for “${p.title}”`;
      return {
        subject,
        html: layout(`<p style="margin:0 0 12px">New on Resoha for your saved search <b>${esc(p.title)}</b>:</p>`
          + items.map((c) => cardHtml(c)).join('')
          + (more ? `<p style="margin:0 0 12px">and ${more} more.</p>` : '') + button(url, 'See all results'), footer('alerts', unsub)),
        text: plain([subject, '', ...items.map((c) => `${c.title} · ${price(c)}\n${listingUrl(c)}`), '', url]),
        telegram: '',
      };
    }
    case 'moderation': {
      const c = p as unknown as Card;
      const subject = `Listing waiting for review: ${c.title}`;
      const dup = p.duplicateOf ? `Possible duplicate of ${SITE_URL}/listings/${p.duplicateOf}` : '';
      return {
        subject,
        html: layout(`<p style="margin:0 0 12px">A new listing is waiting for review before it goes live.</p>`
          + (dup ? `<p style="margin:0 0 12px;color:#b45309">${esc(dup)}</p>` : '')
          + cardHtml(c, 'Open listing') + button(`${SITE_URL}/admin`, 'Open moderation'), footer('agent', unsub)),
        text: plain([subject, dup, listingUrl(c), `${SITE_URL}/admin`]),
        telegram: plain(['Listing to review', c.title, price(c), dup, listingUrl(c)]),
      };
    }
    case 'review_result': {
      const c = p as unknown as Card;
      const ok = p.review === 'approved';
      const subject = ok ? `Your listing is live: ${c.title}` : `Your listing needs changes: ${c.title}`;
      const body = ok ? 'Your listing passed review and is now visible to buyers.'
        : 'Your listing didn’t pass review and is not visible to buyers yet. Fix it and send it for review again.';
      return {
        subject,
        html: layout(`<p style="margin:0 0 12px">${esc(body)}</p>`
          + (p.note ? `<p style="margin:0 0 12px"><b>Reviewer’s note:</b> ${esc(p.note)}</p>` : '')
          + cardHtml(c, 'Open listing') + button(dashboard, 'Open my listings'), footer('agent', unsub)),
        text: plain([subject, body, p.note && `Note: ${p.note}`, listingUrl(c)]),
        telegram: plain([ok ? 'Listing approved' : 'Listing needs changes', c.title, p.note && `Note: ${p.note}`, listingUrl(c)]),
      };
    }
    case 'report': {
      const c = p as unknown as Card;
      const subject = `Listing reported: ${REASONS[p.reason] ?? p.reason}`;
      return {
        subject,
        html: layout(`<p style="margin:0 0 12px">A visitor reported a listing: <b>${esc(REASONS[p.reason] ?? p.reason)}</b>.</p>`
          + (p.message ? `<p style="margin:0 0 12px">“${esc(p.message)}”</p>` : '')
          + cardHtml(c, 'Open listing') + button(`${SITE_URL}/admin`, 'Open reports'), footer('agent', unsub)),
        text: plain([subject, p.message, listingUrl(c)]),
        telegram: plain(['Listing reported', REASONS[p.reason] ?? p.reason, p.message, listingUrl(c)]),
      };
    }
    case 'expiring': {
      const c = p as unknown as Card;
      const subject = `Still available? ${c.title} expires ${dateOnly(p.expiresAt)}`;
      const body = `Your listing stops showing to buyers on ${dateOnly(p.expiresAt)}. If it’s still available, renew it for another 90 days in your dashboard; if it’s sold, mark it as sold.`;
      return {
        subject,
        html: layout(`<p style="margin:0 0 12px">${esc(body)}</p>${cardHtml(c, 'Open listing')}${button(dashboard, 'Renew in my listings')}`, footer('agent', unsub)),
        text: plain([subject, body, dashboard]),
        telegram: plain(['Listing expires soon', c.title, `Renew it: ${dashboard}`]),
      };
    }
    default:
      return null;
  }
}

/* ---------- візити й запрошення (міграція 0055) ---------- */

const manageUrl = (token: string) => `${SITE_URL}/visit/${token}`;

const ROLE_NAMES: Record<string, string> = {
  owner: 'an owner', manager: 'a manager', editor: 'a listing editor', leads: 'a leads manager', agent: 'an agent',
};

/**
 * Нагадування й зміни візиту. event: '24h' (типово, як у 0050), '1h', 'rescheduled', 'cancelled' (скасував покупець),
 * 'cancelled_by_team'. Покупцю — посилання «змінити чи скасувати», ріелтору — ще й у Telegram.
 */
function visitMessage(agent: boolean, p: Payload, unsub?: string | null): Message {
  const c = p.listing as Card;
  const event = String(p.event || '24h');
  const place = c.development || c.title;
  const manage = !agent && p.manageToken && !/cancel/.test(event) ? manageUrl(p.manageToken) : '';
  const was = p.oldVisitAt ? when(p.oldVisitAt) : '';
  const head: Record<string, string> = agent ? {
    '24h': `Reminder: visit tomorrow, ${fmtVisit(p.visitAt)}`,
    '1h': `In 1 hour: visit ${fmtVisit(p.visitAt)}`,
    rescheduled: `Visit moved: ${p.name} · ${fmtVisit(p.visitAt)}`,
    cancelled: `Visit cancelled: ${p.name} · ${fmtVisit(p.visitAt)}`,
  } : {
    '24h': `Reminder: visit tomorrow, ${fmtVisit(p.visitAt)}`,
    '1h': `Your visit starts in 1 hour: ${fmtVisit(p.visitAt)}`,
    rescheduled: `Your visit is moved to ${fmtVisit(p.visitAt)}`,
    cancelled: `Your visit on ${fmtVisit(p.visitAt)} is cancelled`,
    cancelled_by_team: `The sales office cancelled your visit on ${fmtVisit(p.visitAt)}`,
  };
  const what = agent ? ({
    '24h': `${p.name} (${p.phone}) is coming to the sales office ${when(p.visitAt)}.`,
    '1h': `${p.name} (${p.phone}) is coming to the sales office in about an hour, ${when(p.visitAt)}.`,
    rescheduled: `${p.name} (${p.phone}) moved the visit${was ? ` from ${was}` : ''} to ${when(p.visitAt)}.`,
    cancelled: `${p.name} (${p.phone}) cancelled the visit ${when(p.visitAt)}. The slot is free again.`,
  } as Record<string, string>)[event] ?? '' : ({
    '24h': `Your visit to ${place} is ${when(p.visitAt)}.`,
    '1h': `Your visit to ${place} starts in about an hour, ${when(p.visitAt)}.`,
    rescheduled: `Your visit to ${place}${was ? ` is moved from ${was}` : ' is moved'} to ${when(p.visitAt)}.`,
    cancelled: `You cancelled your visit to ${place} on ${when(p.visitAt)}. You can book another time on the property page.`,
    cancelled_by_team: `The sales office of ${place} cancelled your visit on ${when(p.visitAt)}. They will contact you to agree on another time, or you can book one on the property page.`,
  } as Record<string, string>)[event] ?? '';
  const subject = head[event] ?? head['24h'];
  return {
    subject,
    html: layout(`<p style="margin:0 0 12px">${esc(what)}</p>`
      + (manage ? `<p style="margin:0 0 12px">${button(manage, 'Change or cancel the visit')}</p>` : '')
      + cardHtml(c, agent ? 'Open listing' : 'View the property'), footer(agent ? 'agent' : 'transactional', unsub)),
    text: plain([subject, '', what, manage && `Change or cancel: ${manage}`, listingUrl(c)]),
    telegram: agent ? plain([subject, what, listingUrl(c)]) : '',
  };
}
