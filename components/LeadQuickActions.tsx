'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { useLang, useT } from './LangProvider';
import { useMoney } from './CurrencyProvider';
import { intlLocale } from '@/lib/i18n';
import { SITE_URL } from '@/lib/site';
import type { Lead } from '@/lib/types';

/**
 * Швидкі дії по заявці: готова відповідь у WhatsApp з обʼєктом, ціною й посиланням
 * і нагадування «перезвонити». Шаблони ріелтор правит сам — вони живуть у браузері.
 */
const KEY = 'hogarli:reply-templates';

const DEFAULTS = {
  en: [
    'Hi {name}! This is {agent} from Hogarli. Thanks for your interest in {listing} ({price}). Here is the link: {link}. When would be a good time to talk?',
    'Hi {name}! {listing} is still available. Would you like to see it this week? I can do weekdays or Saturday morning.',
    'Hi {name}, just following up on {listing} ({price}). Do you have any questions I can help with? {link}',
  ],
  es: [
    '¡Hola {name}! Soy {agent} de Hogarli. Gracias por su interés en {listing} ({price}). Aquí está el enlace: {link}. ¿Cuándo le queda bien conversar?',
    '¡Hola {name}! {listing} sigue disponible. ¿Le gustaría verla esta semana? Puedo entre semana o el sábado por la mañana.',
    'Hola {name}, le escribo sobre {listing} ({price}). ¿Tiene alguna pregunta en la que le pueda ayudar? {link}',
  ],
};

function loadTemplates(lang: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (Array.isArray(v) && v.every((x) => typeof x === 'string') && v.length) return v;
  } catch { /* приватний режим — беремо стандартні */ }
  return lang === 'es' ? DEFAULTS.es : DEFAULTS.en;
}

/** Закрити поповер кліком поза ним */
function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const on = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener('mousedown', on);
    return () => document.removeEventListener('mousedown', on);
  }, [open, close]);
  return ref;
}

export function QuickReply({ lead: l, agentName }: { lead: Lead; agentName: string }) {
  const t = useT();
  const lang = useLang();
  const money = useMoney();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tpls, setTpls] = useState<string[]>([]);
  const ref = useOutside(open, () => { setOpen(false); setEditing(false); });
  const phone = l.phone.replace(/[^\d]/g, '');

  const fill = (tpl: string) => tpl
    .replaceAll('{name}', l.name.split(' ')[0] || l.name)
    .replaceAll('{agent}', agentName.split(' ')[0] || agentName)
    .replaceAll('{listing}', l.developmentName && !l.listingTitle ? l.developmentName : l.listingTitle || t('the property'))
    .replaceAll('{price}', l.listingPrice ? money.price(l.listingPrice, l.listingDeal ?? 'sale', lang) : '')
    .replaceAll('{link}', `${SITE_URL}${lang === 'es' ? '/es' : ''}/listings/${l.listingId}`)
    .replace(/\s*\(\s*\)/g, '');

  function toggle() {
    if (!open) setTpls(loadTemplates(lang));
    setOpen(!open); setEditing(false);
  }

  function save() {
    const clean = tpls.map((x) => x.trim()).filter(Boolean);
    try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch { /* немає сховища */ }
    setTpls(clean.length ? clean : loadTemplates(lang));
    setEditing(false);
    toast(t('Templates saved'));
  }

  return (
    <div className="qa" ref={ref}>
      <button type="button" className="btn btn--sm btn--wa" onClick={toggle} aria-expanded={open} title={t('Reply on WhatsApp')}>
        <Icon name="chat" size={16} /> <span className="qa__label">{t('Reply')}</span>
      </button>
      {open && (
        <div className="qa__pop" role="dialog" aria-label={t('Reply on WhatsApp')}>
          {!editing ? (
            <>
              <span className="qa__head">{t('Send on WhatsApp')}</span>
              {tpls.map((tpl, i) => (
                <a key={i} className="qa__item" target="_blank" rel="noreferrer" onClick={() => setOpen(false)}
                  href={`https://wa.me/${phone}?text=${encodeURIComponent(fill(tpl))}`}>{fill(tpl)}</a>
              ))}
              <a className="qa__item qa__item--plain" target="_blank" rel="noreferrer" href={`https://wa.me/${phone}`} onClick={() => setOpen(false)}>
                {t('Open chat without text')}
              </a>
              <button type="button" className="link-btn small" onClick={() => setEditing(true)}>{t('Edit templates')}</button>
            </>
          ) : (
            <>
              <span className="qa__head">{t('Reply templates')}</span>
              <span className="tiny muted">{t('Use {name}, {listing}, {price}, {link} and {agent} — they are filled in for each enquiry.')}</span>
              {tpls.map((tpl, i) => (
                <textarea key={i} className="input" rows={3} value={tpl} maxLength={1000}
                  onChange={(e) => setTpls(tpls.map((x, j) => (j === i ? e.target.value : x)))} />
              ))}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {tpls.length < 6 && <button type="button" className="btn btn--sm btn--ghost" onClick={() => setTpls([...tpls, ''])}>{t('Add template')}</button>}
                <button type="button" className="btn btn--sm btn--primary" onClick={save}>{t('Save')}</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const at = (days: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
};

export function RemindButton({ lead: l, onChanged }: { lead: Lead; onChanged: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const ref = useOutside(open, () => setOpen(false));

  async function set(when: Date | null) {
    const res = await fetch(`/api/leads/${l.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remindAt: when ? when.toISOString() : null }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast(d.error ?? t('Not allowed'));
    setOpen(false);
    toast(when ? t('We will remind you {when}', { when: when.toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) }) : t('Reminder removed'));
    onChanged();
  }

  return (
    <div className="qa" ref={ref}>
      <button type="button" className={`btn btn--sm btn--ghost btn--icon ${l.remindAt ? 'is-set' : ''}`} onClick={() => setOpen(!open)}
        title={t('Remind me to call back')} aria-label={t('Remind me to call back')} aria-expanded={open}>
        <Icon name="bell" size={16} />
      </button>
      {open && (
        <div className="qa__pop qa__pop--narrow">
          <span className="qa__head">{t('Remind me to call back')}</span>
          <button type="button" className="qa__item" onClick={() => set(new Date(Date.now() + 2 * 3600_000))}>{t('In 2 hours')}</button>
          <button type="button" className="qa__item" onClick={() => set(at(1, 10))}>{t('Tomorrow at 10:00')}</button>
          <button type="button" className="qa__item" onClick={() => set(at(3, 10))}>{t('In 3 days')}</button>
          <button type="button" className="qa__item" onClick={() => set(at(7, 10))}>{t('In a week')}</button>
          <form className="qa__custom" onSubmit={(e) => { e.preventDefault(); if (custom) set(new Date(custom)); }}>
            <input className="input input--sm" type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label={t('Pick a time')} />
            <button className="btn btn--sm btn--primary" disabled={!custom}>{t('Set')}</button>
          </form>
          {l.remindAt && <button type="button" className="link-btn small" onClick={() => set(null)}>{t('Remove reminder')}</button>}
        </div>
      )}
    </div>
  );
}

/** «Перезвонить: завтра, 10:00» біля імені; прострочене — помаранчеве */
export function RemindPill({ at: when }: { at: string }) {
  const t = useT();
  const lang = useLang();
  const [now] = useState(() => Date.now());
  const d = new Date(when);
  const due = d.getTime() <= now;
  return (
    <span className={`pill ${due ? 'pill--due' : 'pill--off'}`} style={{ marginLeft: 6 }}>
      <Icon name="bell" size={12} /> {t(due ? 'Call back now' : 'Call back {when}', {
        when: d.toLocaleString(intlLocale(lang), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      })}
    </span>
  );
}
