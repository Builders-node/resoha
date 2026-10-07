'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import Photo from './Photo';
import PhotoUploader from './PhotoUploader';
import { toast } from './Toaster';
import type { Developer } from '@/lib/types';

/**
 * Профіль забудовника, який веде сам акаунт: назва, лого, контакти, опис.
 * Публічна сторінка — /developers/<slug>, там же всі ЖК, привʼязані до профілю.
 */
export default function DeveloperPanel() {
  const [items, setItems] = useState<Developer[] | null>(null);
  const [editing, setEditing] = useState<Developer | 'new' | null>(null);

  const load = useCallback(async () => {
    const d = await fetch('/api/developers?mine=1').then((r) => r.json()).catch(() => ({}));
    setItems(d.items ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (items === null) return <div className="panel muted">Loading…</div>;

  if (editing || !items.length) {
    return (
      <DeveloperForm
        dev={editing && editing !== 'new' ? editing : null}
        onCancel={items.length ? () => setEditing(null) : undefined}
        onSaved={() => { setEditing(null); load(); }}
      />
    );
  }

  return (
    <div className="panel">
      <div className="fgroup__head">
        <h3>Developer profile</h3>
        <button className="btn" onClick={() => setEditing('new')}>+ Another company</button>
      </div>
      <p className="muted small" style={{ margin: '4px 0 14px' }}>
        Your company page lists every development linked to it. Agents pick your company from the list when they add a development.
      </p>
      <div className="dev-list">
        {items.map((d) => (
          <div key={d.id} className="dev-list__row">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Photo className="thumb" src={d.logo} label="" />
              <div>
                <b className="with-ico">{d.name}{d.verified && <Icon name="verified" size={15} className="ico ico--ok" />}</b>
                <div className="small muted">{[d.website.replace(/^https?:\/\/(www\.)?/, ''), d.phone].filter(Boolean).join(' · ') || 'No contacts yet'}</div>
              </div>
            </div>
            <div className="chip-row">
              <Link className="btn btn--ghost btn--sm" href={`/developers/${d.slug}`} target="_blank">Open page</Link>
              <button className="btn btn--ghost btn--sm" onClick={() => setEditing(d)}>Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeveloperForm({ dev, onCancel, onSaved }: {
  dev: Developer | null;
  onCancel?: () => void;
  onSaved: () => void;
}) {
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
    if (!res.ok) return toast(data.error ?? 'Could not save');
    toast(dev ? 'Company profile saved' : 'Company page created');
    onSaved();
  }

  async function remove() {
    if (!dev || !confirm(`Delete the ${dev.name} page? Developments stay, they just lose the link.`)) return;
    const res = await fetch(`/api/developers/${dev.id}`, { method: 'DELETE' });
    toast(res.ok ? 'Company page deleted' : 'Not allowed');
    if (res.ok) onSaved();
  }

  return (
    <div className="panel">
      <h3 style={{ marginBottom: 4 }}>{dev ? `Edit ${dev.name}` : 'Developer profile'}</h3>
      {!dev && (
        <p className="muted small" style={{ marginBottom: 14 }}>
          Building on the island? Create your company page — buyers see your projects, contacts and track record in one place.
        </p>
      )}
      <form className="form-grid" onSubmit={submit}>
        <div className="field full"><label>Company name</label>
          <input className="input" name="name" required maxLength={120} defaultValue={dev?.name} placeholder="Darien Village Development" /></div>
        <div className="field full"><label>Logo</label>
          <PhotoUploader value={logo} onChange={(v) => setLogo(v.slice(-1))} max={1} /></div>
        <div className="field"><label>Website</label>
          <input className="input" name="website" defaultValue={dev?.website} placeholder="example.com" /></div>
        <div className="field"><label>Founded</label>
          <input className="input" name="founded" type="number" min={1900} max={2100} defaultValue={dev?.founded ?? ''} placeholder="2015" /></div>
        <div className="field"><label>Phone</label>
          <input className="input" name="phone" maxLength={40} defaultValue={dev?.phone} placeholder="+504 9999 0000" /></div>
        <div className="field"><label>Email</label>
          <input className="input" name="email" type="email" maxLength={120} defaultValue={dev?.email} /></div>
        <div className="field full"><label>About the company</label>
          <textarea className="input" name="about" maxLength={4000} defaultValue={dev?.about}
            placeholder="Projects delivered, construction standards, warranty…" /></div>
        <div className="full" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : dev ? 'Save' : 'Create company page'}</button>
          {onCancel && <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>}
          {dev && <button type="button" className="btn btn--danger" style={{ marginLeft: 'auto' }} onClick={remove}>Delete</button>}
        </div>
      </form>
    </div>
  );
}
