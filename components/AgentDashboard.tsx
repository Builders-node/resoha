'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AgencyPanel from './AgencyPanel';
import Icon from './Icon';
import AvatarPicker from './AvatarPicker';
import ListingForm from './ListingForm';
import { toast } from './Toaster';
import { DEAL_LABELS, fmtDate, fmtNumber, fmtPrice, photoUrl } from '@/lib/format';
import type { Agency, Agent, Lead, Listing, Session } from '@/lib/types';

type Tab = 'listings' | 'leads' | 'new' | 'team' | 'profile';
type Stats = { total: number; active: number; views: number; leads: number; newLeads: number };
type Member = Agent & { listings?: number };

export default function AgentDashboard({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('listings');
  const [scope, setScope] = useState<'own' | 'agency'>('own');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [editing, setEditing] = useState<Listing | null>(null);

  const load = useCallback(async () => {
    const [a, l, t] = await Promise.all([
      fetch(`/api/agents/${session.id}?scope=${scope}`).then((r) => r.json()),
      fetch('/api/leads').then((r) => r.json()),
      fetch('/api/agency/members').then((r) => r.json()),
    ]);
    setAgent(a.agent); setAgency(a.agency); setListings(a.listings); setStats(a.stats);
    setLeads(l.items ?? []);
    setMembers(t.members ?? []);
  }, [session.id, scope]);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(l: Listing) {
    const res = await fetch(`/api/listings/${l.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !l.active }),
    });
    toast(res.ok ? (l.active ? 'Listing unpublished' : 'Listing published') : 'Not allowed');
    load();
  }

  async function setLeadStatus(id: string, status: 'new' | 'done') {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    toast(res.ok ? (status === 'done' ? 'Marked as handled' : 'Back in the queue') : 'Not allowed');
    load();
  }

  async function remove(l: Listing) {
    if (!confirm(`Delete “${l.title}”?`)) return;
    const res = await fetch(`/api/listings/${l.id}`, { method: 'DELETE' });
    toast(res.ok ? 'Listing deleted' : 'Not allowed');
    load();
  }





  if (!agent || !stats) return <div className="wrap" style={{ padding: 60 }}>Loading dashboard…</div>;

  const isOwner = agent.isOwner && !!agency;

  return (
    <div className="wrap dash">
      <nav className="sidenav">
        <a className={tab === 'listings' ? 'is-active' : ''} onClick={() => setTab('listings')}>
          <Icon name="home" size={18} /> Listings
        </a>
        <a className={tab === 'leads' ? 'is-active' : ''} onClick={() => setTab('leads')}>
          <Icon name="inbox" size={18} /> Leads {stats.newLeads > 0 && <span className="pill pill--on">{stats.newLeads}</span>}
        </a>
        <a className={tab === 'new' ? 'is-active' : ''} onClick={() => { setEditing(null); setTab('new'); }}>
          <Icon name="plus" size={18} /> {editing ? 'Edit listing' : 'Add listing'}
        </a>
        <a className={tab === 'team' ? 'is-active' : ''} onClick={() => setTab('team')}>
          <Icon name="building" size={18} /> {agency ? 'Team' : 'Agency'}
        </a>
        <a className={tab === 'profile' ? 'is-active' : ''} onClick={() => setTab('profile')}>
          <Icon name="user" size={18} /> Profile
        </a>
      </nav>

      <div>
        <div className="profile-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={agent.avatar} alt={agent.name} />
          <div>
            <h2 className="with-ico">
              {agent.name}
              {agent.verified && <Icon name="verified" size={17} className="ico ico--ok" />}
            </h2>
            <div className="muted">
              {agency ? agency.name : 'Independent agent'}
              {isOwner && <span className="pill pill--on" style={{ marginLeft: 8 }}>Owner</span>}
              {agent.phone && ` · ${agent.phone}`}
            </div>
          </div>
        </div>

        <div className="stats">
          <div className="stat"><span className="muted small">Listings</span><b>{stats.total}</b></div>
          <div className="stat"><span className="muted small">Published</span><b>{stats.active}</b></div>
          <div className="stat"><span className="muted small">Views</span><b>{fmtNumber(stats.views)}</b></div>
          <div className="stat"><span className="muted small">Leads</span><b>{stats.leads}</b></div>
        </div>

        {tab === 'listings' && (
          <div className="panel">
            <div className="fgroup__head">
              <h3>{scope === 'agency' ? `${agency?.name} listings` : 'My listings'}</h3>
              {isOwner && (
                <div className="chip-row">
                  <button className={`chip-btn ${scope === 'own' ? 'is-on' : ''}`} onClick={() => setScope('own')}>Mine</button>
                  <button className={`chip-btn ${scope === 'agency' ? 'is-on' : ''}`} onClick={() => setScope('agency')}>Whole agency</button>
                </div>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Property</th>
                    {scope === 'agency' && <th>Agent</th>}
                    <th>Price</th><th>Views</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="thumb" src={photoUrl(l.photos[0], 128, 96)} alt="" />
                          <div>
                            <Link href={`/listings/${l.id}`} style={{ fontWeight: 600 }}>{l.title}</Link>
                            <div className="tiny muted">{DEAL_LABELS[l.deal]} · {l.neighborhood} · {fmtDate(l.createdAt)}</div>
                          </div>
                        </div>
                      </td>
                      {scope === 'agency' && (
                        <td className="small">{members.find((m) => m.id === l.agentId)?.name ?? '—'}</td>
                      )}
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtPrice(l.price, l.deal)}</td>
                      <td>{fmtNumber(l.views)}</td>
                      <td><span className={`pill ${l.active ? 'pill--on' : 'pill--off'}`}>{l.active ? 'Live' : 'Hidden'}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn--sm btn--ghost"
                          onClick={() => { setEditing(l); setTab('new'); }}>Edit</button>{' '}
                        <button className="btn btn--sm btn--ghost" onClick={() => toggleActive(l)}>
                          {l.active ? 'Unpublish' : 'Publish'}
                        </button>{' '}
                        <button className="btn btn--sm btn--danger" onClick={() => remove(l)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {listings.length === 0 && (
              <div className="empty"><div className="empty__ico"><Icon name="inbox" size={40} /></div>No listings yet</div>
            )}
          </div>
        )}

        {tab === 'leads' && (
          <div className="panel">
            <h3 style={{ marginBottom: 4 }}>Buyer enquiries</h3>
            <p className="muted small" style={{ marginBottom: 14 }}>
              {isOwner ? 'Everything that came in for your agency, including your team’s listings.' : 'Enquiries on your own listings.'}
            </p>
            {leads.length === 0 ? (
              <div className="empty"><div className="empty__ico"><Icon name="inbox" size={40} /></div>No enquiries yet</div>
            ) : leads.map((l) => (
              <div key={l.id} className="lead">
                <div>
                  <b>{l.name}</b> <span className="muted">· {l.phone}</span>
                  <span className={`pill ${l.status === 'new' ? 'pill--on' : 'pill--off'}`} style={{ marginLeft: 8 }}>
                    {l.status === 'new' ? 'New' : 'Handled'}
                  </span>
                  <p className="muted small" style={{ margin: '6px 0 0' }}>{l.message}</p>
                  <div className="tiny muted" style={{ marginTop: 6 }}>
                    {fmtDate(l.createdAt)} · <Link href={`/listings/${l.listingId}`}>listing {l.listingId}</Link>
                    {l.agentId !== agent.id && ` · agent: ${members.find((m) => m.id === l.agentId)?.name ?? l.agentId}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn--sm btn--ghost"
                    onClick={() => setLeadStatus(l.id, l.status === 'new' ? 'done' : 'new')}>
                    {l.status === 'new' ? 'Mark handled' : 'Reopen'}
                  </button>
                  <a className="btn btn--sm btn--ghost" href={`https://wa.me/${l.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">
                    <Icon name="chat" size={16} /> WhatsApp
                  </a>
                  <a className="btn btn--sm btn--primary" href={`tel:${l.phone.replace(/[^+\d]/g, '')}`}>
                    <Icon name="phone" size={16} /> Call
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'new' && (
          <ListingForm
            listing={editing}
            agencyName={agency?.name ?? null}
            onSaved={() => { setEditing(null); setTab('listings'); load(); }}
            onCancel={editing ? () => { setEditing(null); setTab('listings'); } : undefined}
          />
        )}

        {tab === 'team' && <AgencyPanel meId={session.id} onChanged={load} />}

        {tab === 'profile' && (
          <div className="panel">
            <h3 style={{ marginBottom: 14 }}>Agent profile</h3>
            <div style={{ marginBottom: 18 }}>
              <AvatarPicker src={agent.avatar} name={agent.name} onChanged={() => load()} />
            </div>
            <form className="form-grid" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const res = await fetch('/api/profile', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(Object.fromEntries(fd.entries())),
              });
              toast(res.ok ? 'Profile saved' : 'Could not save');
              load();
            }}>
              <div className="field"><label>Name</label><input className="input" name="name" defaultValue={agent.name} /></div>
              <div className="field"><label>Phone</label><input className="input" name="phone" defaultValue={agent.phone} /></div>
              <div className="field"><label>WhatsApp</label><input className="input" name="whatsapp" defaultValue={agent.whatsapp} /></div>
              <div className="field"><label>Years on island</label><input className="input" name="experience" type="number" defaultValue={agent.experience} /></div>
              <div className="field full"><label>About</label><textarea className="input" name="about" defaultValue={agent.about} /></div>
              <div className="full"><button className="btn btn--primary">Save</button></div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
