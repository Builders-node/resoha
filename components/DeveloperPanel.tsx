'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from './Icon';
import Pager from './Pager';
import Photo from './Photo';
import PhotoUploader from './PhotoUploader';
import { toast } from './Toaster';
import EmbedSnippets from './EmbedSnippets';
import type { Developer } from '@/lib/types';
import { useT } from './LangProvider';

/**
 * Профіль забудовника, який веде сам акаунт: назва, лого, контакти, опис.
 * Публічна сторінка — /developers/<slug>, там же всі ЖК, привʼязані до профілю.
 */
export default function DeveloperPanel() {
  const t = useT();
  const [items, setItems] = useState<Developer[] | null>(null);
  const [editing, setEditing] = useState<Developer | 'new' | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<'name' | 'new'>('name');
  const [page, setPage] = useState(1);
  const [links, setLinks] = useState<Record<string, string>>({});

  /** Пошук і фільтр скидають сторінку, щоб не лишитись на порожній 7-й */
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = (items ?? []).filter((d) => FILTERS[filter](d)
      && (!needle || [d.name, d.website, d.phone, d.email].some((v) => v?.toLowerCase().includes(needle))));
    return sort === 'new' ? [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : list;
  }, [items, q, filter, sort]);
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE));
  const cur = Math.min(page, pageCount);

  const load = useCallback(async () => {
    const d = await fetch('/api/developers?mine=1').then((r) => r.json()).catch(() => ({}));
    setItems(d.items ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  /** Одноразове посилання, за яким представник компанії забирає профіль собі; з email — ще й лист */
  async function handover(d: Developer, email?: string) {
    const res = await fetch(`/api/developers/${d.id}/handover`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(email ? { email } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error ?? t('Could not create the link')); return false; }
    const url = `${location.origin}/developer/claim/${data.token}`;
    setLinks((l) => ({ ...l, [d.id]: url }));
    if (email) { toast(t('Sent to {email}', { email })); return true; }
    try { await navigator.clipboard.writeText(url); toast(t('Link copied — send it to the company')); } catch { toast(t('Link ready — copy it below')); }
    return true;
  }

  if (items === null) return <div className="panel muted">{t('Loading…')}</div>;

  if (editing || !items.length) {
    return (
      <>
        <DeveloperForm
          dev={editing && editing !== 'new' ? editing : null}
          onCancel={items.length ? () => setEditing(null) : undefined}
          onSaved={() => { setEditing(null); load(); }}
        />
        {/* ЖК ріелтора можна вбудувати й без профілю компанії */}
        {!editing && <EmbedSnippets companyIds={[]} />}
      </>
    );
  }

  return (
    <>
    <div className="panel">
      <div className="fgroup__head">
        <h3>{t('Developer profile')}</h3>
        <button className="btn" onClick={() => setEditing('new')}>{t('+ Another company')}</button>
      </div>
      <p className="muted small" style={{ margin: '4px 0 14px' }}>
        {t('Your company page lists every development linked to it. Agents pick your company from the list when they add a development.')}{' '}
        {t('To give a page to the company itself, use Hand over and send them the link, or email it right from here: whoever opens it and signs in becomes the owner, together with the developments and units you added for it.')}
      </p>
      {items.length > 8 && (
        <div className="co-tools">
          <input className="input" type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder={t('Search {n} companies', { n: items.length })} aria-label={t('Search companies')} />
          <select className="input co-tools__sort" value={sort} onChange={(e) => setSort(e.target.value as 'name' | 'new')} aria-label={t('Sort')}>
            <option value="name">{t('Name A–Z')}</option>
            <option value="new">{t('Recently added')}</option>
          </select>
          <div className="co-tabs" role="tablist" aria-label={t('Filter companies')}>
            {(Object.keys(FILTERS) as Filter[]).map((f) => {
              const n = items.filter(FILTERS[f]).length;
              if (f !== 'all' && !n && filter !== f) return null;
              return (
                <button key={f} type="button" role="tab" aria-selected={filter === f}
                  className={`co-tab ${filter === f ? 'is-on' : ''}`} onClick={() => { setFilter(f); setPage(1); }}>
                  {t(FILTER_LABELS[f])} <span>{n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {shown.length ? (
        <ul className="co-list">
          {shown.slice((cur - 1) * PAGE, cur * PAGE).map((d) => {
            const site = d.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
            return (
              <li key={d.id} className="co-row">
                <span className="co-row__logo">
                  {d.logo
                    ? <Photo src={d.logo} alt="" sizes="96px" />
                    : <span className="co-row__ini" aria-hidden>{initials(d.name)}</span>}
                </span>
                <div className="co-row__info">
                  <b className="co-row__name">
                    <span>{d.name}</span>
                    {d.verified && <Icon name="verified" size={15} className="ico ico--ok" />}
                  </b>
                  <div className="co-row__meta">
                    {site || d.phone
                      ? <>{site && <span>{site}</span>}{d.phone && <span>{d.phone}</span>}</>
                      : <span className="co-row__warn">{t('No contacts yet')}</span>}
                  </div>
                </div>
                <div className="co-row__acts">
                  <Link className="btn btn--ghost btn--sm" href={`/developers/${d.slug}`} target="_blank">{t('Open page')}</Link>
                  <button className={`btn btn--ghost btn--sm ${links[d.id] ? 'is-on' : ''}`} title={t('Create a link the company uses to take over this page')} onClick={() => handover(d)}>
                    <Icon name="link" size={15} />{t('Hand over')}
                  </button>
                  <button className="btn btn--ghost btn--sm btn--icon" title={t('Edit')} aria-label={t('Edit {name}', { name: d.name })} onClick={() => setEditing(d)}><Icon name="pencil" size={16} /></button>
                </div>
                {links[d.id] && (
                  <div className="co-row__handover">
                    <input className="input small" readOnly value={links[d.id]} onFocus={(e) => e.currentTarget.select()}
                      aria-label={t('Handover link for {name}', { name: d.name })} />
                    <HandoverEmail name={d.name} onSend={(email) => handover(d, email)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="co-empty muted">{t('No companies match the search')}</p>
      )}
      {pageCount > 1 && (
        <div className="co-foot">
          <span className="small muted">{t('{a}–{b} of {n}', { a: (cur - 1) * PAGE + 1, b: Math.min(cur * PAGE, shown.length), n: shown.length })}</span>
          <Pager page={cur} count={pageCount} onGo={setPage} />
        </div>
      )}
    </div>
    <EmbedSnippets companyIds={items.map((d) => d.id)} />
    </>
  );
}

const PAGE = 20;
type Filter = 'all' | 'verified' | 'nologo' | 'nocontacts';
/** Чого бракує профілю — так видно, кого ще доповнити перед передачею компанії */
const FILTERS: Record<Filter, (d: Developer) => boolean> = {
  all: () => true,
  verified: (d) => d.verified,
  nologo: (d) => !d.logo,
  nocontacts: (d) => !d.website && !d.phone && !d.email,
};
const FILTER_LABELS: Record<Filter, string> = {
  all: 'All companies', verified: 'Verified companies', nologo: 'Without a logo', nocontacts: 'Without contacts',
};

/** Дві літери замість порожньої камери, коли лого ще немає */
function initials(name: string) {
  const w = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '') + (w[1]?.[0] ?? '')).toUpperCase() || '·';
}

/** Надіслати посилання на передачу листом; нове посилання замінює показане вище */
function HandoverEmail({ name, onSend }: { name: string; onSend: (email: string) => Promise<boolean> }) {
  const t = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (await onSend(email.trim())) setEmail('');
    setBusy(false);
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
      <input className="input small" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder={t('Or email it to the company')} aria-label={t('Email for the {name} handover', { name })} style={{ flex: 1 }} />
      <button className="btn btn--sm" disabled={busy}>{t(busy ? 'Sending…' : 'Send')}</button>
    </form>
  );
}

function DeveloperForm({ dev, onCancel, onSaved }: {
  dev: Developer | null;
  onCancel?: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [logo, setLogo] = useState<string[]>(dev?.logo ? [dev.logo] : []);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const res = await fetch(dev ? `/api/developers/${dev.id}` : '/api/developers', {
      method: dev ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...Object.fromEntries(fd.entries()), logo: logo[0] ?? '' }),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error ?? t('Could not save'));
    toast(t(dev ? 'Company profile saved' : 'Company page created'));
    onSaved();
  }

  async function remove() {
    if (!dev || !confirm(t('Delete the {name} page? Developments stay, they just lose the link.', { name: dev.name }))) return;
    const res = await fetch(`/api/developers/${dev.id}`, { method: 'DELETE' });
    toast(t(res.ok ? 'Company page deleted' : 'Not allowed'));
    if (res.ok) onSaved();
  }

  return (
    <div className="panel">
      <h3 style={{ marginBottom: 4 }}>{dev ? t('Edit {name}', { name: dev.name }) : t('Developer profile')}</h3>
      {!dev && (
        <p className="muted small" style={{ marginBottom: 14 }}>
          {t('Building in Honduras? Create your company page — buyers see your projects, contacts and track record in one place.')}
        </p>
      )}
      <form className="form-grid" onSubmit={submit}>
        <div className="field full"><label>{t('Company name')}</label>
          <input className="input" name="name" required maxLength={120} defaultValue={dev?.name} placeholder={t('Darien Village Development')} /></div>
        <div className="field full"><label>{t('Logo')}</label>
          <PhotoUploader value={logo} onChange={(v) => setLogo(v.slice(-1))} max={1} /></div>
        <div className="field"><label>{t('Website')}</label>
          <input className="input" name="website" defaultValue={dev?.website} placeholder="example.com" /></div>
        <div className="field"><label>{t('Founded')}</label>
          <input className="input" name="founded" type="number" min={1900} max={2100} defaultValue={dev?.founded ?? ''} placeholder="2015" /></div>
        <div className="field"><label>{t('Phone')}</label>
          <input className="input" name="phone" maxLength={40} defaultValue={dev?.phone} placeholder="+504 9999 0000" /></div>
        <div className="field"><label>{t('Email')}</label>
          <input className="input" name="email" type="email" maxLength={120} defaultValue={dev?.email} /></div>
        <div className="field full"><label>{t('About the company')}</label>
          <textarea className="input" name="about" maxLength={4000} defaultValue={dev?.about}
            placeholder={t('Projects delivered, construction standards, warranty…')} /></div>
        <div className="full" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn--primary" disabled={saving}>{t(saving ? 'Saving…' : dev ? 'Save' : 'Create company page')}</button>
          {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>{t('Cancel')}</button>}
          {dev && <button type="button" className="btn btn--danger btn--icon" title={t('Delete')} aria-label={t('Delete company page')} style={{ marginLeft: 'auto' }} onClick={remove}><Icon name="trash" size={16} /></button>}
        </div>
      </form>
    </div>
  );
}
