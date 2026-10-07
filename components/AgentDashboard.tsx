'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AgencyPanel from './AgencyPanel';
import AnalyticsPanel from './AnalyticsPanel';
import DashboardListings from './DashboardListings';
import DeveloperPanel from './DeveloperPanel';
import DevelopmentsPanel from './DevelopmentsPanel';
import Icon from './Icon';
import AvatarPicker from './AvatarPicker';
import ListingForm from './ListingForm';
import { toast } from './Toaster';
import { fmtDate, fmtNumber } from '@/lib/format';
import type { Agency, Agent, Lead, Listing, Session } from '@/lib/types';
import Avatar from './Avatar';
import TabStrip from './TabStrip';

export type Tab = 'listings' | 'analytics' | 'leads' | 'new' | 'developments' | 'developer' | 'team' | 'profile';
type Stats = { total: number; active: number; views: number; leads: number; newLeads: number };
type Member = Agent & { listings?: number };
type Team = { agency: Agency; isOwner: boolean; active: boolean };

export default function AgentDashboard({ session, initialTab }: { session: Session; initialTab?: Tab }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'listings');
  const [scope, setScope] = useState<'own' | 'agency'>('own');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editing, setEditing] = useState<Listing | null>(null);

  const load = useCallback(async () => {
    const [a, l, t, tm] = await Promise.all([
      fetch(`/api/agents/${session.id}?scope=${scope}`).then((r) => r.json()),
      fetch('/api/leads').then((r) => r.json()),
      fetch('/api/agency/members').then((r) => r.json()),
      fetch('/api/agency/teams').then((r) => r.json()),
    ]);
    setTeams(tm.teams ?? []);
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





  async function switchTeam(agencyId: string) {
    const res = await fetch('/api/agency/teams', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agencyId }),
    });
    const d = await res.json();
    if (!res.ok) return toast(d.error ?? 'Could not switch');
    toast(`Now working in ${teams.find((t) => t.agency.id === agencyId)?.agency.name ?? 'the team'}`);
    setScope('own'); load(); router.refresh();
  }

  if (!agent || !stats) return <div className="wrap" style={{ padding: 60 }}>Loading dashboard…</div>;

  const isOwner = agent.isOwner && !!agency;

  return (
    <div className="wrap dash">
      <TabStrip>
        <a className={tab === 'listings' ? 'is-active' : ''} onClick={() => setTab('listings')}>
          <Icon name="home" size={18} /> Listings
        </a>
        <a className={tab === 'analytics' ? 'is-active' : ''} onClick={() => setTab('analytics')}>
          <Icon name="chart" size={18} /> Analytics
        </a>
        <a className={tab === 'leads' ? 'is-active' : ''} onClick={() => setTab('leads')}>
          <Icon name="inbox" size={18} /> Leads {stats.newLeads > 0 && <span className="pill pill--on">{stats.newLeads}</span>}
        </a>
        <a className={tab === 'new' ? 'is-active' : ''} onClick={() => { setEditing(null); setTab('new'); }}>
          <Icon name="plus" size={18} /> {editing ? 'Edit listing' : 'Add listing'}
        </a>
        <a className={tab === 'developments' ? 'is-active' : ''} onClick={() => setTab('developments')}>
          <Icon name="building" size={18} /> Developments
        </a>
        <a className={tab === 'developer' ? 'is-active' : ''} onClick={() => setTab('developer')}>
          <Icon name="briefcase" size={18} /> Developer
        </a>
        <a className={tab === 'team' ? 'is-active' : ''} onClick={() => setTab('team')}>
          <Icon name="building" size={18} /> {agency ? 'Team' : 'Agency'}
        </a>
        <a className={tab === 'profile' ? 'is-active' : ''} onClick={() => setTab('profile')}>
          <Icon name="user" size={18} /> Profile
        </a>
      </TabStrip>

      <div>
        <div className="profile-head">
          <Avatar src={agent.avatar} name={agent.name} />
          <div>
            <h2 className="with-ico">
              {agent.name}
              {agent.verified && <Icon name="verified" size={17} className="ico ico--ok" />}
            </h2>
            <div className="muted">
              {/* кілька команд — назва стає перемикачем активної */}
              {agency && teams.length > 1 ? (
                <select className="team-switch" value={agency.id} aria-label="Switch team"
                  onChange={(e) => switchTeam(e.target.value)}>
                  {teams.map((t) => <option key={t.agency.id} value={t.agency.id}>{t.agency.name}</option>)}
                </select>
              ) : agency ? agency.name : 'Independent agent'}
              {isOwner && <span className="pill pill--on" style={{ marginLeft: 8 }}>Owner</span>}
              {agent.phone && ` · ${agent.phone}`}
            </div>
          </div>
        </div>

        {/* Телефон при реєстрації не питаємо — без нього на картці обʼєкта немає кнопки WhatsApp */}
        {!agent.phone && !agent.whatsapp && tab !== 'profile' && (
          <div className="note-ok" style={{ margin: '0 0 18px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1 }}>Add your phone or WhatsApp so buyers can reach you straight from your listings.</span>
            <button type="button" className="btn btn--ghost" onClick={() => setTab('profile')}>Add contacts</button>
          </div>
        )}

        {tab !== 'analytics' && <div className="stats">
          <div className="stat"><span className="muted small">Listings</span><b>{stats.total}</b></div>
          <div className="stat"><span className="muted small">Published</span><b>{stats.active}</b></div>
          <div className="stat"><span className="muted small">Views</span><b>{fmtNumber(stats.views)}</b></div>
          <div className="stat"><span className="muted small">Leads</span><b>{stats.leads}</b></div>
        </div>}

        {tab === 'analytics' && <AnalyticsPanel isOwner={isOwner} agencyName={agency?.name} />}

        {tab === 'developments' && <DevelopmentsPanel onUnitsAdded={load} isAdmin={!!session.isAdmin} />}

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

            {listings.length > 0 && (
              <DashboardListings
                listings={listings}
                agentName={scope === 'agency' ? (id) => members.find((m) => m.id === id)?.name ?? '—' : undefined}
                onEdit={(l) => { setEditing(l); setTab('new'); }}
                onToggle={toggleActive}
                onDelete={remove}
              />
            )}
            {listings.length === 0 && (
              <div className="empty"><div className="empty__ico"><Icon name="inbox" size={40} /></div>
                No listings yet — add your first one from the tab above.</div>
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
                  <b>{l.name}</b>{l.phone && <span className="muted"> · {l.phone}</span>}
                  <span className={`pill ${l.status === 'new' ? 'pill--on' : 'pill--off'}`} style={{ marginLeft: 8 }}>
                    {l.status === 'new' ? 'New' : 'Handled'}
                  </span>
                  {l.channel === 'whatsapp' && <span className="pill pill--off" style={{ marginLeft: 6 }}>WhatsApp</span>}
                  <p className="muted small" style={{ margin: '6px 0 0' }}>{l.message}</p>
                  <div className="tiny muted" style={{ marginTop: 6 }}>
                    {fmtDate(l.createdAt)} · <Link href={`/listings/${l.listingId}`}>{l.listingTitle || 'the listing'}</Link>
                    {l.agentId !== agent.id && ` · agent: ${members.find((m) => m.id === l.agentId)?.name ?? l.agentId}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn--sm btn--ghost"
                    onClick={() => setLeadStatus(l.id, l.status === 'new' ? 'done' : 'new')}>
                    {l.status === 'new' ? 'Mark handled' : 'Reopen'}
                  </button>
                  {/* анонімний перехід у WhatsApp номера не лишає — дзвонити нікуди */}
                  {l.phone && (
                    <>
                      <a className="btn btn--sm btn--ghost" href={`https://wa.me/${l.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">
                        <Icon name="chat" size={16} /> WhatsApp
                      </a>
                      <a className="btn btn--sm btn--primary" href={`tel:${l.phone.replace(/[^+\d]/g, '')}`}>
                        <Icon name="phone" size={16} /> Call
                      </a>
                    </>
                  )}
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

        {tab === 'developer' && <DeveloperPanel />}

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
              <div className="field"><label>Viber</label><input className="input" name="viber" defaultValue={agent.viber} placeholder="+504 9999 0000" /></div>
              <div className="field"><label>Telegram</label><input className="input" name="telegram" defaultValue={agent.telegram} placeholder="@username" /></div>
              <div className="field"><label>Years on island</label><input className="input" name="experience" type="number" defaultValue={agent.experience} /></div>
              <div className="field full"><label>About</label><textarea className="input" name="about" defaultValue={agent.about} /></div>
              <div className="full" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn--primary">Save</button>
                <button type="button" className="btn btn--ghost" onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  router.push('/');
                  router.refresh();
                }}>
                  <Icon name="logout" size={17} /> Sign out
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
