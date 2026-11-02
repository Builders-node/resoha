'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AgencyPanel from './AgencyPanel';
import AnalyticsPanel from './AnalyticsPanel';
import DashboardListings from './DashboardListings';
import DeveloperPanel from './DeveloperPanel';
import DevelopmentsPanel from './DevelopmentsPanel';
import LeadsCrm from './LeadsCrm';
import Icon from './Icon';
import ImportPanel from './ImportPanel';
import AvatarPicker from './AvatarPicker';
import ListingForm from './ListingForm';
import NotifySettings from './NotifySettings';
import ViewingHoursSettings from './ViewingHoursSettings';
import { renewedUntil } from '@/lib/lifecycle';
import PromotePanel, { type PromoPick } from './PromotePanel';
import BillingPanel from './BillingPanel';
import { toast } from './Toaster';
import { fmtNumber } from '@/lib/format';
import type { Agency, Agent, Lead, Listing, Session } from '@/lib/types';
import type { Tab } from '@/lib/agentTabs';
import Avatar from './Avatar';
import { useT } from './LangProvider';
import TabStrip from './TabStrip';
import VerificationCard from './VerificationCard';
import VisitsCalendar from './VisitsCalendar';
import { agencyCan, agencyRoleOf, roleLabel } from '@/lib/teamRoles';
import { announceCabinet } from '@/lib/cabinetBus';

type Stats = { total: number; active: number; views: number; leads: number; newLeads: number };
type Member = Agent & { listings?: number };
type Team = { agency: Agency; isOwner: boolean; active: boolean };

type NavItem = { tab: Tab; icon: string; label: string; count?: number; alert?: boolean };

/**
 * Меню кабінету за розділами: що продаю, хто звернувся, як просуваю, хто я.
 * «Add listing» сюди не входить — це окрема кнопка над меню.
 */
function navGroups({ agency, total, newLeads, developer }: { agency: boolean; total: number; newLeads: number; developer: boolean }): { title: string; items: NavItem[] }[] {
  // у забудовника той самий кабінет, але мовою його роботи: проєкти, квартири, компанія
  if (developer) {
    return [
      { title: 'Sales', items: [
        { tab: 'developments', icon: 'building', label: 'Projects' },
        { tab: 'listings', icon: 'home', label: 'Units', count: total },
        { tab: 'leads', icon: 'inbox', label: 'Leads', count: newLeads || undefined, alert: true },
        { tab: 'visits', icon: 'calendar', label: 'Visits' },
      ] },
      { title: 'Growth', items: [
        { tab: 'analytics', icon: 'chart', label: 'Analytics' },
        { tab: 'import', icon: 'download', label: 'Import' },
        { tab: 'promote', icon: 'sparkle', label: 'Promote' },
      ] },
      { title: 'Account', items: [
        { tab: 'developer', icon: 'briefcase', label: 'Company' },
        { tab: 'team', icon: 'users', label: agency ? 'Team' : 'Agency' },
        { tab: 'plan', icon: 'wallet', label: 'Plan' },
        { tab: 'profile', icon: 'user', label: 'Profile' },
      ] },
    ];
  }
  return [
    { title: 'Sales', items: [
      { tab: 'listings', icon: 'home', label: 'Listings', count: total },
      { tab: 'developments', icon: 'building', label: 'Developments' },
      { tab: 'import', icon: 'download', label: 'Import' },
      { tab: 'leads', icon: 'inbox', label: 'Leads', count: newLeads || undefined, alert: true },
      { tab: 'visits', icon: 'calendar', label: 'Visits' },
    ] },
    { title: 'Growth', items: [
      { tab: 'analytics', icon: 'chart', label: 'Analytics' },
      { tab: 'promote', icon: 'sparkle', label: 'Promote' },
    ] },
    { title: 'Account', items: [
      { tab: 'profile', icon: 'user', label: 'Profile' },
      { tab: 'team', icon: 'users', label: agency ? 'Team' : 'Agency' },
      { tab: 'plan', icon: 'wallet', label: 'Plan' },
      { tab: 'developer', icon: 'briefcase', label: 'Developer company' },
    ] },
  ];
}

export default function AgentDashboard({ session, initialTab }: { session: Session; initialTab?: Tab }) {
  const router = useRouter();
  const t = useT();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'listings');
  // власнику й менеджеру одразу вся агенція: «Mine» з 2 з 77 оголошень виглядав як зникнення решти
  const [scope, setScope] = useState<'own' | 'agency'>(agencyCan(session, 'listings') ? 'agency' : 'own');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  // є профіль забудовника — кабінет говорить «проєкти / квартири / компанія»
  const landed = useRef(false);
  const [developer, setDeveloper] = useState(initialTab === 'developer' || initialTab === 'developments');
  const [editing, setEditing] = useState<Listing | null>(null);
  const [promoPick, setPromoPick] = useState<PromoPick | null>(null);
  const promote = (p: PromoPick) => { setPromoPick(p); setTab('promote'); };

  const load = useCallback(async () => {
    const [a, l, tr, tm, dv] = await Promise.all([
      fetch(`/api/agents/${session.id}?scope=${scope}`).then((r) => r.json()),
      fetch('/api/leads').then((r) => r.json()),
      fetch('/api/agency/members').then((r) => r.json()),
      fetch('/api/agency/teams').then((r) => r.json()),
      fetch('/api/developers?mine=1').then((r) => r.json()).catch(() => ({})),
    ]);
    if ((dv.items ?? []).length > 0) {
      setDeveloper(true);
      // забудовник починає з проєктів, а не зі списку квартир — лише при першому відкритті
      if (!initialTab && !landed.current) setTab((x) => (x === 'listings' ? 'developments' : x));
    }
    landed.current = true;
    setTeams(tm.teams ?? []);
    setAgent(a.agent); setAgency(a.agency); setListings(a.listings); setStats(a.stats);
    setLeads(l.items ?? []);
    setMembers(tr.members ?? []);
  }, [session.id, scope]);

  useEffect(() => { load(); }, [load]);

  // нижня панель кабінету на телефоні (Sidebar) перемикає вкладки подією і підсвічує активну
  useEffect(() => {
    const go = (e: Event) => {
      const next = (e as CustomEvent<Tab>).detail;
      if (next === 'new') setEditing(null);
      setPromoPick(null);
      setTab(next);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('cabinet:go', go);
    return () => window.removeEventListener('cabinet:go', go);
  }, []);
  useEffect(() => { announceCabinet({ tab, newLeads: stats?.newLeads ?? 0, developer }); }, [tab, stats?.newLeads, developer]);

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
    toast(t(res.ok ? (l.active ? 'Listing unpublished' : 'Listing published') : 'Not allowed'));
    load();
  }

  /** Продовжити показ або надіслати чернетку: що саме дозволено, вирішує база (listings_review) */
  async function patchListing(l: Listing, patch: Record<string, unknown>, done: string) {
    const res = await fetch(`/api/listings/${l.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast(d.error ?? t('Not allowed'));
    toast(d.listing?.review === 'pending' ? t('Sent for review — it goes live once checked') : done);
    load();
  }

  async function remove(l: Listing) {
    if (!confirm(t('Delete “{title}”?', { title: l.title }))) return;
    const res = await fetch(`/api/listings/${l.id}`, { method: 'DELETE' });
    toast(t(res.ok ? 'Listing deleted' : 'Not allowed'));
    load();
  }





  async function switchTeam(agencyId: string) {
    const res = await fetch('/api/agency/teams', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agencyId }),
    });
    const d = await res.json();
    if (!res.ok) return toast(d.error ?? t('Could not switch'));
    toast(t('Now working in {name}', { name: teams.find((x) => x.agency.id === agencyId)?.agency.name ?? t('the team') }));
    setScope(agencyCan(session, 'listings') ? 'agency' : 'own'); load(); router.refresh();
  }

  if (!agent || !stats) return <div className="wrap" style={{ padding: 60 }}>{t('Loading dashboard…')}</div>;

  const isOwner = agent.isOwner && !!agency;
  // усі оголошення команди бачать власник, менеджер і редактор (0055); роль — із сесії (публічний профіль її не має)
  const role = { agencyId: agent.agencyId, isOwner: agent.isOwner, agencyRole: session.agencyRole };
  const canListings = !!agency && agencyCan(role, 'listings');

  return (
    <div className="wrap dash">
      <TabStrip>
        {/* головна дія кабінету — окрема кнопка зверху, а не пункт серед вкладок */}
        <a className={`sidenav__add ${tab === 'new' ? 'is-active' : ''}`} title={t('Add listing')} onClick={() => { setEditing(null); setTab('new'); }}>
          <Icon name={editing && tab === 'new' ? 'pencil' : 'plus'} size={18} />
          <span className="sidenav__add-label">{t(editing && tab === 'new' ? 'Edit listing' : 'Add listing')}</span>
        </a>
        {navGroups({ agency: !!agency, total: stats.total, newLeads: stats.newLeads, developer }).map((g) => (
          <div key={g.title} className="sidenav__group" role="group" aria-label={t(g.title)}>
            <span className="sidenav__title">{t(g.title)}</span>
            {g.items.map((it) => (
              <a key={it.tab} className={tab === it.tab ? 'is-active' : ''} onClick={() => { setPromoPick(null); setTab(it.tab); }}>
                <Icon name={it.icon} size={18} /> {t(it.label)}
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
                <select className="team-switch" value={agency.id} aria-label={t('Switch team')}
                  onChange={(e) => switchTeam(e.target.value)}>
                  {teams.map((t) => <option key={t.agency.id} value={t.agency.id}>{t.agency.name}</option>)}
                </select>
              ) : agency ? agency.name : t('Independent agent')}
              {agency && agencyRoleOf(role) !== 'agent' && <span className="pill pill--on" style={{ marginLeft: 8 }}>{t(roleLabel(agencyRoleOf(role)))}</span>}
              {agent.phone && ` · ${agent.phone}`}
            </div>
          </div>
        </div>

        {/* Телефон при реєстрації не питаємо — без нього на картці обʼєкта немає кнопки WhatsApp */}
        {!agent.phone && !agent.whatsapp && tab !== 'profile' && (
          <div className="note-ok" style={{ margin: '0 0 20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1 }}>{t('Add your phone or WhatsApp so buyers can reach you straight from your listings.')}</span>
            <button type="button" className="btn btn--ghost" onClick={() => setTab('profile')}>{t('Add contacts')}</button>
          </div>
        )}

        {/* цифри потрібні поруч з оголошеннями й заявками; у профілі чи команді вони лише відсувають форму */}
        {(tab === 'listings' || tab === 'leads') && <div className="stats stats--dash">
          <div className="stat"><span className="muted small">{t('Listings')}</span><b>{stats.total}</b></div>
          <div className="stat"><span className="muted small">{t('Published')}</span><b>{stats.active}</b></div>
          <div className="stat"><span className="muted small">{t('Views')}</span><b>{fmtNumber(stats.views)}</b></div>
          <div className="stat"><span className="muted small">{t('Leads')}</span><b>{stats.leads}</b></div>
        </div>}

        {tab === 'promote' && <PromotePanel pick={promoPick} />}

        {tab === 'plan' && <BillingPanel developer={developer} />}

        {tab === 'analytics' && <AnalyticsPanel isOwner={canListings} agencyName={agency?.name} />}

        {tab === 'visits' && <ViewingHoursSettings />}
        {tab === 'visits' && <VisitsCalendar meId={session.id} />}

        {tab === 'developments' && <DevelopmentsPanel onUnitsAdded={load} isAdmin={!!session.isAdmin}
          onPromote={(id) => promote({ kind: 'development', id })} />}

        {tab === 'listings' && (
          <div className="panel">
            <div className="fgroup__head">
              <h3>{developer ? t('Units') : scope === 'agency' ? t('{name} listings', { name: agency?.name ?? '' }) : t('My listings')}</h3>
              {canListings && (
                <div className="chip-row">
                  <button className={`chip-btn ${scope === 'own' ? 'is-on' : ''}`} onClick={() => setScope('own')}>{t('Mine')}</button>
                  <button className={`chip-btn ${scope === 'agency' ? 'is-on' : ''}`} onClick={() => setScope('agency')}>{t('Whole agency')}</button>
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
                onRenew={(l) => patchListing(l, { expiresAt: renewedUntil() }, t('Renewed for 90 days'))}
                onSubmit={(l) => patchListing(l, { review: 'pending' }, t('Listing published'))}
                onBulkDone={load}
                onPromote={(l) => promote({ kind: 'listing', id: l.id })}
              />
            )}
            {listings.length === 0 && (
              <div className="empty"><div className="empty__ico"><Icon name="inbox" size={40} /></div>
                {t('No listings yet — add your first one from the tab above.')}</div>
            )}
          </div>
        )}

        {tab === 'leads' && (
          <LeadsCrm leads={leads} meId={agent.id} meName={agent.name} isOwner={isOwner} agencyId={agency?.id ?? null}
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

        {tab === 'import' && <ImportPanel onDone={load} />}

        {tab === 'developer' && <DeveloperPanel />}

        {tab === 'team' && <AgencyPanel meId={session.id} onChanged={load} />}

        {tab === 'team' && isOwner && agency && (
          <VerificationCard kind="agency" subjectId={agency.id} name={agency.name} verified={agency.verified} onChanged={load} />
        )}

        {tab === 'profile' && (
          <div className="panel">
            <h3 style={{ marginBottom: 14 }}>{t('Agent profile')}</h3>
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
              toast(t(res.ok ? 'Profile saved' : 'Could not save'));
              load();
            }}>
              <div className="field"><label>{t('Name')}</label><input className="input" name="name" defaultValue={agent.name} /></div>
              <div className="field"><label>{t('Phone')}</label><input className="input" name="phone" defaultValue={agent.phone} /></div>
              <div className="field"><label>WhatsApp</label><input className="input" name="whatsapp" defaultValue={agent.whatsapp} /></div>
              <div className="field"><label>Viber</label><input className="input" name="viber" defaultValue={agent.viber} placeholder="+504 9999 0000" /></div>
              <div className="field"><label>Telegram</label><input className="input" name="telegram" defaultValue={agent.telegram} placeholder="@username" /></div>
              <div className="field"><label>{t('Years of experience')}</label><input className="input" name="experience" type="number" defaultValue={agent.experience} /></div>
              <div className="field full"><label>{t('About')}</label><textarea className="input" name="about" defaultValue={agent.about} /></div>
              <div className="full" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn btn--primary">{t('Save')}</button>
                <button type="button" className="btn btn--ghost" onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  router.push('/');
                  router.refresh();
                }}>
                  <Icon name="logout" size={17} /> {t('Sign out')}
                </button>
              </div>
            </form>
          </div>
        )}

        {tab === 'profile' && (
          <VerificationCard kind="agent" subjectId={agent.id} name={agent.name} verified={agent.verified} onChanged={load} />
        )}

        {tab === 'profile' && <NotifySettings agent />}
      </div>
    </div>
  );
}
