'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AgencyPanel from './AgencyPanel';
import AnalyticsPanel from './AnalyticsPanel';
import DashboardListings from './DashboardListings';
import DeveloperPanel from './DeveloperPanel';
import DevelopmentsPanel from './DevelopmentsPanel';
import LeadsCrm from './LeadsCrm';
import Icon from './Icon';
import AvatarPicker from './AvatarPicker';
import ListingForm from './ListingForm';
import NotifySettings from './NotifySettings';
import { renewedUntil } from '@/lib/lifecycle';
import PromotePanel from './PromotePanel';
import { toast } from './Toaster';
import { fmtNumber } from '@/lib/format';
import type { Agency, Agent, Lead, Listing, Session } from '@/lib/types';
import type { Tab } from '@/lib/agentTabs';
import Avatar from './Avatar';
import TabStrip from './TabStrip';

type Stats = { total: number; active: number; views: number; leads: number; newLeads: number };
type Member = Agent & { listings?: number };
type Team = { agency: Agency; isOwner: boolean; active: boolean };

type NavItem = { tab: Tab; icon: string; label: string; count?: number; alert?: boolean };

/**
 * Меню кабінету за розділами: що продаю, хто звернувся, як просуваю, хто я.
 * «Add listing» сюди не входить — це окрема кнопка над меню.
 */
function navGroups({ agency, total, newLeads }: { agency: boolean; total: number; newLeads: number }): { title: string; items: NavItem[] }[] {
  return [
    { title: 'Sales', items: [
      { tab: 'listings', icon: 'home', label: 'Listings', count: total },
      { tab: 'developments', icon: 'building', label: 'Developments' },
      { tab: 'leads', icon: 'inbox', label: 'Leads', count: newLeads || undefined, alert: true },
    ] },
    { title: 'Growth', items: [
      { tab: 'analytics', icon: 'chart', label: 'Analytics' },
      { tab: 'promote', icon: 'sparkle', label: 'Promote' },
    ] },
    { title: 'Account', items: [
      { tab: 'profile', icon: 'user', label: 'Profile' },
      { tab: 'team', icon: 'users', label: agency ? 'Team' : 'Agency' },
      { tab: 'developer', icon: 'briefcase', label: 'Developer company' },
    ] },
  ];
}

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

  // вкладка живе в адресі: після оновлення сторінки чи «Назад» лишаєшся там, де був
  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === 'listings') url.searchParams.delete('tab'); else url.searchParams.set('tab', tab);
    window.history.replaceState(window.history.state, '', url);
  }, [tab]);

  async function toggleActive(l: Listing) {
    const res = await fetch(`/api/listings/${l.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !l.active }),
    });
    toast(res.ok ? (l.active ? 'Listing unpublished' : 'Listing published') : 'Not allowed');
    load();
  }

  /** Продовжити показ або надіслати чернетку: що саме дозволено, вирішує база (listings_review) */
  async function patchListing(l: Listing, patch: Record<string, unknown>, done: string) {
    const res = await fetch(`/api/listings/${l.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast(d.error ?? 'Not allowed');
    toast(d.listing?.review === 'pending' ? 'Sent for review — it goes live once checked' : done);
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
        {/* головна дія кабінету — окрема кнопка зверху, а не пункт серед вкладок */}
        <a className={`sidenav__add ${tab === 'new' ? 'is-active' : ''}`} title="Add listing" onClick={() => { setEditing(null); setTab('new'); }}>
          <Icon name={editing && tab === 'new' ? 'pencil' : 'plus'} size={18} />
          <span className="sidenav__add-label">{editing && tab === 'new' ? 'Edit listing' : 'Add listing'}</span>
        </a>
        {navGroups({ agency: !!agency, total: stats.total, newLeads: stats.newLeads }).map((g) => (
          <div key={g.title} className="sidenav__group" role="group" aria-label={g.title}>
            <span className="sidenav__title">{g.title}</span>
            {g.items.map((it) => (
              <a key={it.tab} className={tab === it.tab ? 'is-active' : ''} onClick={() => setTab(it.tab)}>
                <Icon name={it.icon} size={18} /> {it.label}
                {it.count != null && <span className={`sidenav__count ${it.alert ? 'is-alert' : ''}`}>{it.count}</span>}
              </a>
            ))}
          </div>
        ))}
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
          <div className="note-ok" style={{ margin: '0 0 20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1 }}>Add your phone or WhatsApp so buyers can reach you straight from your listings.</span>
            <button type="button" className="btn btn--ghost" onClick={() => setTab('profile')}>Add contacts</button>
          </div>
        )}

        {/* цифри потрібні поруч з оголошеннями й заявками; у профілі чи команді вони лише відсувають форму */}
        {(tab === 'listings' || tab === 'leads') && <div className="stats">
          <div className="stat"><span className="muted small">Listings</span><b>{stats.total}</b></div>
          <div className="stat"><span className="muted small">Published</span><b>{stats.active}</b></div>
          <div className="stat"><span className="muted small">Views</span><b>{fmtNumber(stats.views)}</b></div>
          <div className="stat"><span className="muted small">Leads</span><b>{stats.leads}</b></div>
        </div>}

        {tab === 'promote' && <PromotePanel />}

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
                onRenew={(l) => patchListing(l, { expiresAt: renewedUntil() }, 'Renewed for 90 days')}
                onSubmit={(l) => patchListing(l, { review: 'pending' }, 'Listing published')}
                onBulkDone={load}
              />
            )}
            {listings.length === 0 && (
              <div className="empty"><div className="empty__ico"><Icon name="inbox" size={40} /></div>
                No listings yet — add your first one from the tab above.</div>
            )}
          </div>
        )}

        {tab === 'leads' && (
          <LeadsCrm leads={leads} meId={agent.id} isOwner={isOwner} agencyId={agency?.id ?? null}
            members={members} onChanged={load} />
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
            <div style={{ marginBottom: 20 }}>
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

        {tab === 'profile' && <NotifySettings agent />}
      </div>
    </div>
  );
}
