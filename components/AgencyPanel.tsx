'use client';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import type { Agency, Agent } from '@/lib/types';

type Member = Agent & { listings?: number };

const SWATCHES = ['#16305c', '#ff5a00', '#a4145a', '#1b2450', '#0f766e', '#2b2b30', '#7c3aed', '#b45309'];

export default function AgencyPanel({ meId, onChanged }: { meId: string; onChanged: () => void }) {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [brand, setBrand] = useState('#16305c');
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const d = await fetch('/api/agency/members').then((r) => r.json());
    setAgency(d.agency ?? null);
    setMembers(d.members ?? []);
    setInviteCode(d.inviteCode ?? null);
    if (d.agency) setBrand(d.agency.brand);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const me = members.find((m) => m.id === meId);
  const isOwner = Boolean(me?.isOwner && agency);

  async function saveAgency(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/agency', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'),
        about: fd.get('about'), brand,
      }),
    });
    const d = await res.json();
    toast(res.ok ? 'Agency profile saved' : d.error ?? 'Could not save');
    load(); onChanged();
  }

  async function openAgency(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/agency', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email'),
        about: fd.get('about'), brand,
      }),
    });
    const d = await res.json();
    if (!res.ok) return toast(d.error ?? 'Could not open the agency');
    toast(`${d.agency.name} is live — your listings now publish under it`);
    load(); onChanged();
  }

  async function join(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = new FormData(e.currentTarget).get('inviteCode');
    const res = await fetch('/api/agency/members', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: code }),
    });
    const d = await res.json();
    if (!res.ok) return toast(d.error ?? 'Could not join');
    toast(`You joined ${d.agency.name}`);
    load(); onChanged();
  }

  async function saveMember(id: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/agency/members/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'), phone: fd.get('phone'), whatsapp: fd.get('whatsapp'),
        experience: fd.get('experience'), about: fd.get('about'),
        verified: fd.get('verified') === 'on', active: fd.get('active') === 'on',
      }),
    });
    const d = await res.json();
    toast(res.ok ? 'Agent updated' : d.error ?? 'Not allowed');
    if (res.ok) setEditing(null);
    load(); onChanged();
  }

  async function toggleOwner(m: Member) {
    const res = await fetch(`/api/agency/members/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isOwner: !m.isOwner }),
    });
    const d = await res.json();
    toast(res.ok ? (m.isOwner ? `${m.name} is now a regular agent` : `${m.name} is now an owner`) : d.error);
    load(); onChanged();
  }

  async function remove(m: Member) {
    if (!confirm(`Remove ${m.name} from ${agency?.name}? The account stays, listings become independent.`)) return;
    const res = await fetch(`/api/agency/members/${m.id}`, { method: 'DELETE' });
    toast(res.ok ? `${m.name} removed` : (await res.json()).error ?? 'Not allowed');
    load(); onChanged();
  }

  async function rotate() {
    const res = await fetch('/api/agency/invite', { method: 'POST' });
    const d = await res.json();
    if (res.ok) { setInviteCode(d.inviteCode); toast('New invite code issued — the old one stopped working'); }
    else toast(d.error ?? 'Not allowed');
  }

  async function leave() {
    if (!confirm(`Leave ${agency?.name}? You keep your account and go back to listing independently.`)) return;
    const res = await fetch('/api/agency/leave', { method: 'POST' });
    const d = await res.json();
    if (!res.ok) return toast(d.error);
    toast(d.closed ? 'Agency closed — you are independent again' : 'You left the agency');
    load(); onChanged();
  }

  if (loading) return <div className="panel">Loading agency…</div>;

  /* ---------- незалежний ріелтор ---------- */
  if (!agency) {
    return (
      <>
        <div className="panel">
          <h3>Open your own agency</h3>
          <p className="muted small" style={{ margin: '8px 0 16px' }}>
            You become the owner: your listings move under the agency brand, you get an invite code for other
            realtors, and you can edit everyone in the team. You can close it and go independent again at any time.
          </p>
          <form className="form-grid" onSubmit={openAgency}>
            <div className="field full"><label>Agency name</label>
              <input className="input" name="name" required placeholder="Palm Ridge Realty" /></div>
            <div className="field"><label>Phone</label><input className="input" name="phone" placeholder="+504 …" /></div>
            <div className="field"><label>Email</label><input className="input" name="email" type="email" placeholder="office@…" /></div>
            <div className="field full"><label>About</label>
              <textarea className="input" name="about" placeholder="Which areas you cover and what you are known for" /></div>
            <div className="field full"><label>Brand colour</label><BrandPicker value={brand} onChange={setBrand} /></div>
            <div className="full"><button className="btn btn--primary btn--lg">Create agency</button></div>
          </form>
        </div>

        <div className="panel" style={{ marginTop: 18 }}>
          <h3>Or join an existing one</h3>
          <p className="muted small" style={{ margin: '8px 0 14px' }}>
            Ask the agency for their invite code. Your listings then publish under their brand and their owner can
            help manage them.
          </p>
          <form onSubmit={join} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="input" name="inviteCode" placeholder="ABCD-2345" style={{ maxWidth: 220 }} required />
            <button className="btn btn--primary">Join agency</button>
          </form>
          <p className="tiny muted" style={{ marginTop: 14 }}>
            Staying independent is fine too — listings simply go out under your own name.
          </p>
        </div>
      </>
    );
  }

  /* ---------- у складі агенції ---------- */
  return (
    <>
      <div className="panel">
        <div className="fgroup__head">
          <h3>{isOwner ? 'Agency profile' : agency.name}</h3>
          <span className="muted small">{members.length} {members.length === 1 ? 'agent' : 'agents'}</span>
        </div>

        {isOwner ? (
          <form className="form-grid" onSubmit={saveAgency}>
            <div className="field full"><label>Agency name</label>
              <input className="input" name="name" defaultValue={agency.name} required /></div>
            <div className="field"><label>Phone</label><input className="input" name="phone" defaultValue={agency.phone} /></div>
            <div className="field"><label>Email</label><input className="input" name="email" defaultValue={agency.email} /></div>
            <div className="field full"><label>About</label>
              <textarea className="input" name="about" defaultValue={agency.about} /></div>
            <div className="field full"><label>Brand colour — shown on the agency tile</label>
              <BrandPicker value={brand} onChange={setBrand} /></div>
            <div className="full" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn--primary">Save agency</button>
              <Link className="btn btn--ghost" href={`/listings?agencyId=${agency.id}`}>View public listings</Link>
            </div>
          </form>
        ) : (
          <p className="muted small">{agency.about || 'No description yet.'}</p>
        )}
      </div>

      {isOwner && (
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="invite" style={{ marginTop: 0 }}>
            <div>
              <div className="tiny muted" style={{ textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>
                Invite code
              </div>
              <div className="invite__code">{inviteCode}</div>
              <div className="tiny muted">
                A realtor enters this at signup or in their dashboard to join {agency.name}.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => {
                navigator.clipboard?.writeText(inviteCode ?? ''); toast('Invite code copied');
              }}>Copy</button>
              <button className="btn btn--sm" onClick={rotate}>Regenerate</button>
            </div>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 18 }}>
        <h3 style={{ marginBottom: 12 }}>Team</h3>
        <table className="table">
          <thead><tr><th>Agent</th><th>Listings</th><th>Role</th><th></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <Fragment key={m.id}>
                <tr>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.avatar} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {m.name}{' '}
                          {m.verified && <Icon name="verified" size={14} className="ico ico--ok" />}
                          {!m.active && <span className="pill pill--off" style={{ marginLeft: 6 }}>Suspended</span>}
                        </div>
                        <div className="tiny muted">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{m.listings ?? 0}</td>
                  <td><span className={`pill ${m.isOwner ? 'pill--on' : 'pill--off'}`}>{m.isOwner ? 'Owner' : 'Agent'}</span></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {isOwner && (
                      <>
                        <button className="btn btn--sm btn--ghost"
                          onClick={() => setEditing(editing === m.id ? null : m.id)}>
                          {editing === m.id ? 'Close' : 'Edit'}
                        </button>{' '}
                        <button className="btn btn--sm" onClick={() => toggleOwner(m)}>
                          {m.isOwner ? 'Make agent' : 'Make owner'}
                        </button>{' '}
                        {!m.isOwner && <button className="btn btn--sm btn--danger" onClick={() => remove(m)}>Remove</button>}
                      </>
                    )}
                  </td>
                </tr>

                {isOwner && editing === m.id && (
                  <tr>
                    <td colSpan={4} style={{ background: 'var(--bg-soft)' }}>
                      <form className="form-grid" onSubmit={(e) => saveMember(m.id, e)} style={{ padding: '6px 2px 10px' }}>
                        <div className="field"><label>Name</label><input className="input" name="name" defaultValue={m.name} /></div>
                        <div className="field"><label>Years on island</label>
                          <input className="input" name="experience" type="number" defaultValue={m.experience} /></div>
                        <div className="field"><label>Phone</label><input className="input" name="phone" defaultValue={m.phone} /></div>
                        <div className="field"><label>WhatsApp</label><input className="input" name="whatsapp" defaultValue={m.whatsapp} /></div>
                        <div className="field full"><label>About</label><textarea className="input" name="about" defaultValue={m.about} /></div>
                        <div className="field full switch-inline">
                          <label><input type="checkbox" name="verified" defaultChecked={m.verified} /> Verified by the agency</label>
                          <label><input type="checkbox" name="active" defaultChecked={m.active} /> Account active</label>
                        </div>
                        <div className="full"><button className="btn btn--primary">Save agent</button></div>
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--danger btn--sm" onClick={leave}>Leave agency</button>
          <span className="tiny muted">
            You keep your account and listings — they simply go back to your own name.
            {isOwner && ' As the last owner, hand the role to someone first (or leave to close the agency).'}
          </span>
        </div>
      </div>
    </>
  );
}

function BrandPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="brand-pick">
      {SWATCHES.map((c) => (
        <button key={c} type="button" className={`brand-dot ${value === c ? 'is-on' : ''}`}
          style={{ background: c }} onClick={() => onChange(c)} aria-label={c} />
      ))}
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Custom colour" />
      <code>{value}</code>
    </div>
  );
}
