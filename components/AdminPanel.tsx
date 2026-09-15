'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmAction, { type Ask } from './ConfirmAction';
import Icon from './Icon';
import ListingForm from './ListingForm';
import Photo from './Photo';
import { toast } from './Toaster';
import { DEAL_LABELS, fmtDate, fmtNumber, fmtPrice } from '@/lib/format';
import type { AdminLogEntry, Agency, Agent, Lead, Listing, Review, Session } from '@/lib/types';
import Avatar from './Avatar';

type Tab = 'overview' | 'listings' | 'leads' | 'agencies' | 'users' | 'reviews' | 'log';
type Quality = { noPhotos: number; noSource: number; untitledLand: number; thinText: number; offIsland: number };
type Overview = {
  listings: number; hidden: number; agencies: number; reviews: number; leads: number;
  newLeads: number; views: number; agents: number; buyers: number;
  unverifiedAgents: number; suspended: number; quality: Quality;
};
type AgencyRowData = { agency: Agency; agents: number; listings: number };

const TABS: { v: Tab; label: string; ico: string }[] = [
  { v: 'overview', label: 'Overview', ico: 'sliders' },
  { v: 'listings', label: 'Listings', ico: 'home' },
  { v: 'leads', label: 'Enquiries', ico: 'inbox' },
  { v: 'agencies', label: 'Agencies', ico: 'building' },
  { v: 'users', label: 'People', ico: 'user' },
  { v: 'reviews', label: 'Reviews', ico: 'star' },
  { v: 'log', label: 'Log', ico: 'list' },
];

/** «1 realtors» виглядало як помилка — тримаємо однину окремо. */
const plural = (n: number, one: string, many = `${one}s`) => `${n === 1 ? one : many} ${n === 1 ? 'is' : 'are'}`;

const PAGE = 25;
const has = (haystack: (string | undefined)[], needle: string) =>
  !needle || haystack.some((h) => (h ?? '').toLowerCase().includes(needle.toLowerCase()));

export default function AdminPanel({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agencies, setAgencies] = useState<AgencyRowData[]>([]);
  const [users, setUsers] = useState<Agent[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [log, setLog] = useState<AdminLogEntry[]>([]);
  const [busy, setBusy] = useState(false);

  // пошук і фільтри живуть на клієнті: списки й так приходять цілком
  const [q, setQ] = useState('');
  const [state, setState] = useState('all');
  const [shown, setShown] = useState(PAGE);

  const [ask, setAsk] = useState<Ask | null>(null);
  const [editing, setEditing] = useState<Listing | null>(null);

  const load = useCallback(async (which: Tab) => {
    setBusy(true);
    const d = await fetch(`/api/admin?section=${which}`).then((r) => r.json());
    if (which === 'overview') setOverview(d.overview);
    if (which === 'listings') setListings(d.items ?? []);
    if (which === 'leads') setLeads(d.items ?? []);
    if (which === 'agencies') setAgencies(d.items ?? []);
    if (which === 'users') setUsers(d.items ?? []);
    if (which === 'reviews') setReviews(d.items ?? []);
    if (which === 'log') setLog(d.items ?? []);
    setBusy(false);
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);
  // новий розділ — чистий пошук, інакше «нічого не знайдено» без видимої причини
  useEffect(() => { setQ(''); setState('all'); setShown(PAGE); setEditing(null); }, [tab]);
  useEffect(() => { setShown(PAGE); }, [q, state]);

  async function act(body: Record<string, unknown>, message: string) {
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    toast(res.ok ? message : d.error ?? 'Not allowed');
    load(tab);
  }

  /** Дія з підтвердженням: причина їде в журнал разом із записом. */
  const confirmAct = (a: Omit<Ask, 'onConfirm'>, body: Record<string, unknown>, message: string) =>
    setAsk({ ...a, onConfirm: (reason) => act({ ...body, reason }, message) });

  const filteredListings = useMemo(() => listings.filter((l) => {
    if (state === 'live' && !l.active) return false;
    if (state === 'hidden' && l.active) return false;
    if (state === 'featured' && !l.featured) return false;
    if (state === 'nophoto' && l.photos.length > 0) return false;
    return has([l.title, l.neighborhood, l.address, l.sourceName], q);
  }), [listings, state, q]);

  const filteredUsers = useMemo(() => users.filter((u) => {
    if (state === 'agents' && u.role !== 'agent') return false;
    if (state === 'buyers' && u.role !== 'user') return false;
    if (state === 'admins' && !u.isAdmin) return false;
    if (state === 'suspended' && u.active) return false;
    if (state === 'unverified' && (u.verified || u.role !== 'agent')) return false;
    return has([u.name, u.email, u.agency], q);
  }), [users, state, q]);

  const filteredLeads = useMemo(() => leads.filter((l) => {
    if (state !== 'all' && l.status !== state) return false;
    return has([l.name, l.phone, l.email, l.listingTitle, l.agentName], q);
  }), [leads, state, q]);

  const filteredAgencies = useMemo(() => agencies.filter(({ agency }) => {
    if (state === 'verified' && !agency.verified) return false;
    if (state === 'unverified' && agency.verified) return false;
    return has([agency.name, agency.email, agency.phone], q);
  }), [agencies, state, q]);

  const toolbar = (placeholder: string, options: { v: string; label: string }[], total: number, listed: number) => (
    <div className="adm-bar">
      <input className="input" type="search" value={q} placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)} />
      <select className="input" value={state} onChange={(e) => setState(e.target.value)}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
      <span className="muted small">{busy ? 'Loading…' : `${fmtNumber(listed)} of ${fmtNumber(total)}`}</span>
    </div>
  );

  const more = (listed: number) => listed > shown && (
    <button className="btn btn--ghost btn--block" style={{ marginTop: 12 }}
      onClick={() => setShown((n) => n + PAGE)}>
      Show more — {fmtNumber(listed - shown)} left
    </button>
  );

  return (
    <div className="wrap dash">
      <nav className="sidenav">
        {TABS.map((t) => (
          <a key={t.v} className={tab === t.v ? 'is-active' : ''} onClick={() => setTab(t.v)}>
            <Icon name={t.ico} size={18} /> {t.label}
          </a>
        ))}
      </nav>

      <div>
        <div className="profile-head">
          <div className="admin-mark"><Icon name="verified" size={26} /></div>
          <div>
            <h2>Platform admin</h2>
            <div className="muted">Signed in as {session.name} · moderation and platform-wide settings</div>
          </div>
        </div>

        {tab === 'overview' && (
          overview ? (
            <>
              <div className="stats">
                <div className="stat"><span className="muted small">Listings</span><b>{fmtNumber(overview.listings)}</b></div>
                <div className="stat"><span className="muted small">Hidden</span><b>{fmtNumber(overview.hidden)}</b></div>
                <div className="stat">
                  <span className="muted small">Views, all time</span><b>{fmtNumber(overview.views)}</b>
                </div>
                <div className="stat"><span className="muted small">Enquiries</span><b>{fmtNumber(overview.leads)}</b></div>
              </div>
              <div className="stats">
                <div className="stat"><span className="muted small">Agencies</span><b>{fmtNumber(overview.agencies)}</b></div>
                <div className="stat"><span className="muted small">Realtors</span><b>{fmtNumber(overview.agents)}</b></div>
                <div className="stat"><span className="muted small">Buyers</span><b>{fmtNumber(overview.buyers)}</b></div>
                <div className="stat"><span className="muted small">Reviews</span><b>{fmtNumber(overview.reviews)}</b></div>
              </div>

              {/* Рядок із нулем — це не «увага», а шум: показуємо лише те, що справді чекає */}
              {(() => {
                const rows = [
                  overview.unverifiedAgents > 0 && {
                    key: 'unverified',
                    body: <><b>{overview.unverifiedAgents}</b> {plural(overview.unverifiedAgents, 'realtor')} not verified yet</>,
                    hint: 'Verified agents get a badge on their card and profile',
                    go: () => { setTab('users'); setTimeout(() => setState('unverified'), 0); },
                  },
                  overview.newLeads > 0 && {
                    key: 'leads',
                    body: <><b>{overview.newLeads}</b> {overview.newLeads === 1 ? 'enquiry' : 'enquiries'} still marked new</>,
                    hint: 'Across every agency on the platform',
                    go: () => { setTab('leads'); setTimeout(() => setState('new'), 0); },
                  },
                  overview.suspended > 0 && {
                    key: 'suspended',
                    body: <><b>{overview.suspended}</b> suspended {overview.suspended === 1 ? 'account' : 'accounts'}</>,
                    hint: 'They cannot sign in, and their listings drop out of search',
                    go: () => { setTab('users'); setTimeout(() => setState('suspended'), 0); },
                  },
                ].filter(Boolean) as { key: string; body: React.ReactNode; hint: string; go: () => void }[];

                return (
                  <div className="panel">
                    <h3 style={{ marginBottom: rows.length ? 12 : 4 }}>Needs attention</h3>
                    {rows.length === 0 ? (
                      <p className="muted small">Nothing waiting — no unverified realtors, unanswered enquiries or suspended accounts.</p>
                    ) : rows.map((r) => (
                      <div key={r.key} className="lead">
                        <div>{r.body}<div className="tiny muted">{r.hint}</div></div>
                        <button className="btn btn--sm btn--ghost" onClick={r.go}>Open</button>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Те, що псує довіру до площадки, помітно тільки таким списком */}
              <div className="panel">
                <h3 style={{ marginBottom: 4 }}>Listing quality</h3>
                <p className="muted small" style={{ marginBottom: 12 }}>
                  Checks that matter on this island market, counted across every listing.
                </p>
                <div className="quality">
                  {([
                    ['No photos', overview.quality.noPhotos, 'nophoto'],
                    ['No source link', overview.quality.noSource, null],
                    ['Land, title not confirmed', overview.quality.untitledLand, null],
                    ['Description under 40 characters', overview.quality.thinText, null],
                    ['Coordinates outside Roatán', overview.quality.offIsland, null],
                  ] as [string, number, string | null][]).map(([label, n, filter]) => (
                    <div key={label} className={`quality__row ${n > 0 ? 'is-bad' : ''}`}>
                      <span>{label}</span>
                      <b>{fmtNumber(n)}</b>
                      {n > 0 && filter && (
                        <button className="btn btn--sm btn--ghost"
                          onClick={() => { setTab('listings'); setTimeout(() => setState(filter), 0); }}>Show</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : <div className="panel">Loading…</div>
        )}

        {tab === 'listings' && (
          <div className="panel">
            <div className="fgroup__head"><h3>All listings</h3></div>
            {toolbar('Search by title, area, address or source…', [
              { v: 'all', label: 'Any state' },
              { v: 'live', label: 'Live only' },
              { v: 'hidden', label: 'Hidden only' },
              { v: 'featured', label: 'Featured' },
              { v: 'nophoto', label: 'Without photos' },
            ], listings.length, filteredListings.length)}

            {editing && (
              <div style={{ margin: '14px 0' }}>
                <ListingForm listing={editing} asAdmin onSaved={() => { setEditing(null); load('listings'); }}
                  onCancel={() => setEditing(null)} />
              </div>
            )}

            {filteredListings.length === 0 ? (
              <p className="muted small">{busy ? 'Loading…' : 'Nothing matches this search.'}</p>
            ) : (
              <>
                <table className="table">
                  <thead><tr><th>Property</th><th>Price</th><th>Views</th><th>State</th><th></th></tr></thead>
                  <tbody>
                    {filteredListings.slice(0, shown).map((l) => (
                      <tr key={l.id}>
                        <td data-label="Property">
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <Photo className="thumb" src={l.photos[0]} label="" />
                            <div>
                              <Link href={`/listings/${l.id}`} style={{ fontWeight: 600 }}>{l.title}</Link>
                              <div className="tiny muted">{DEAL_LABELS[l.deal]} · {l.neighborhood} · {fmtDate(l.createdAt)}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Price" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtPrice(l.price, l.deal)}</td>
                        <td data-label="Views">{fmtNumber(l.views)}</td>
                        <td data-label="State" style={{ whiteSpace: 'nowrap' }}>
                          <span className={`pill ${l.active ? 'pill--on' : 'pill--off'}`}>{l.active ? 'Live' : 'Hidden'}</span>
                          {l.featured && <span className="pill pill--on" style={{ marginLeft: 6 }}>Featured</span>}
                        </td>
                        <td className="td--act" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                          <button className="btn btn--sm btn--ghost" onClick={() => setEditing(l)}>Edit</button>{' '}
                          <button className="btn btn--sm btn--ghost"
                            onClick={() => act({ kind: 'listing', id: l.id, featured: !l.featured, targetName: l.title },
                              l.featured ? 'Removed from the home page' : 'Featured on the home page')}>
                            {l.featured ? 'Unfeature' : 'Feature'}
                          </button>{' '}
                          <button className="btn btn--sm btn--danger"
                            onClick={() => confirmAct(
                              {
                                title: l.active ? 'Take this listing down?' : 'Put it back up?',
                                text: l.title,
                                confirmLabel: l.active ? 'Take down' : 'Restore',
                                danger: l.active,
                                reasonRequired: l.active,
                              },
                              { kind: 'listing', id: l.id, active: !l.active, targetName: l.title },
                              l.active ? 'Listing taken down' : 'Listing restored',
                            )}>
                            {l.active ? 'Take down' : 'Restore'}
                          </button>{' '}
                          <button className="btn btn--sm btn--danger"
                            onClick={() => confirmAct(
                              {
                                title: 'Delete permanently?',
                                text: `${l.title} — the listing and its photos are removed for good. Taking it down is reversible; this is not.`,
                                confirmLabel: 'Delete',
                                danger: true,
                                reasonRequired: true,
                              },
                              { kind: 'listing', id: l.id, remove: true, targetName: l.title },
                              'Listing deleted',
                            )}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {more(filteredListings.length)}
              </>
            )}
          </div>
        )}

        {tab === 'leads' && (
          <div className="panel">
            <div className="fgroup__head"><h3>Enquiries</h3></div>
            <p className="muted small" style={{ marginBottom: 10 }}>
              Every enquiry on the platform, read-only — the realtor owns their own pipeline.
              Use it to spot the ones nobody answers.
            </p>
            {toolbar('Search by buyer, phone, property or realtor…', [
              { v: 'all', label: 'Any status' },
              { v: 'new', label: 'New only' },
              { v: 'done', label: 'Handled' },
            ], leads.length, filteredLeads.length)}

            {filteredLeads.length === 0 ? (
              <div className="empty"><div className="empty__ico"><Icon name="inbox" size={40} /></div>
                {busy ? 'Loading…' : 'No enquiries yet'}</div>
            ) : (
              <>
                {filteredLeads.slice(0, shown).map((l) => (
                  <div key={l.id} className="lead">
                    <div>
                      <b>{l.name}</b>
                      <span className={`pill ${l.status === 'new' ? 'pill--on' : 'pill--off'}`} style={{ marginLeft: 8 }}>
                        {l.status === 'new' ? 'New' : 'Handled'}
                      </span>
                      <div className="tiny muted" style={{ marginTop: 3 }}>
                        {l.phone}{l.email && ` · ${l.email}`} · {fmtDate(l.createdAt)}
                      </div>
                      <div className="small" style={{ marginTop: 4 }}>
                        <Link href={`/listings/${l.listingId}`}>{l.listingTitle || 'listing'}</Link>
                        {l.agentName && <span className="muted"> → {l.agentName}</span>}
                      </div>
                      {l.message && <p className="muted small" style={{ margin: '6px 0 0' }}>{l.message}</p>}
                    </div>
                  </div>
                ))}
                {more(filteredLeads.length)}
              </>
            )}
          </div>
        )}

        {tab === 'agencies' && (
          <div className="panel">
            <div className="fgroup__head"><h3>Agencies</h3></div>
            {agencies.length === 0 ? (
              <p className="muted small">No agencies registered yet — the table fills in as they sign up.</p>
            ) : (
              <>
                {toolbar('Search by name, email or phone…', [
                  { v: 'all', label: 'Any status' },
                  { v: 'verified', label: 'Verified' },
                  { v: 'unverified', label: 'Unverified' },
                ], agencies.length, filteredAgencies.length)}
                <table className="table">
                  <thead><tr><th>Agency</th><th>Agents</th><th>Listings</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {filteredAgencies.slice(0, shown).map(({ agency, agents, listings: n }) => (
                      <tr key={agency.id}>
                        <td data-label="Agency">
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span className="agc-dot" style={{ background: agency.brand }} />
                            <div>
                              <Link href={`/agency/${agency.id}`} style={{ fontWeight: 600 }}>{agency.name}</Link>
                              <div className="tiny muted">{agency.email || 'no email'} · joined {fmtDate(agency.createdAt)}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Agents">{agents}</td>
                        <td data-label="Listings">{n}</td>
                        <td data-label="Status">
                          <span className={`pill ${agency.verified ? 'pill--on' : 'pill--off'}`}>
                            {agency.verified ? 'Verified' : 'Unverified'}
                          </span>
                        </td>
                        <td className="td--act" style={{ textAlign: 'right' }}>
                          <button className="btn btn--sm btn--ghost"
                            onClick={() => confirmAct(
                              {
                                title: agency.verified ? `Remove verification from ${agency.name}?` : `Verify ${agency.name}?`,
                                text: agency.verified
                                  ? 'The badge disappears from their page and cards.'
                                  : 'Confirm you have seen their licence — the badge is a promise to buyers.',
                                confirmLabel: agency.verified ? 'Unverify' : 'Verify',
                                danger: agency.verified,
                              },
                              { kind: 'agency', id: agency.id, verified: !agency.verified, targetName: agency.name },
                              agency.verified ? 'Verification removed' : `${agency.name} verified`,
                            )}>
                            {agency.verified ? 'Unverify' : 'Verify'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {more(filteredAgencies.length)}
              </>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="panel">
            <div className="fgroup__head"><h3>People</h3></div>
            {toolbar('Search by name, email or agency…', [
              { v: 'all', label: 'Everyone' },
              { v: 'agents', label: 'Realtors' },
              { v: 'buyers', label: 'Buyers' },
              { v: 'admins', label: 'Admins' },
              { v: 'unverified', label: 'Unverified realtors' },
              { v: 'suspended', label: 'Suspended' },
            ], users.length, filteredUsers.length)}

            {filteredUsers.length === 0 ? (
              <p className="muted small">{busy ? 'Loading…' : 'Nobody matches this search.'}</p>
            ) : (
              <>
                <table className="table">
                  <thead><tr><th>Account</th><th>Role</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {filteredUsers.slice(0, shown).map((u) => (
                      <tr key={u.id}>
                        <td data-label="Account">
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <Avatar src={u.avatar} name={u.name} style={{ width: 34, height: 34, fontSize: 12 }} />
                            <div>
                              {u.role === 'agent'
                                ? <Link href={`/agents/${u.id}`} style={{ fontWeight: 600 }}>{u.name}</Link>
                                : <span style={{ fontWeight: 600 }}>{u.name}</span>}
                              <div className="tiny muted">{u.email}{u.agencyId && u.agency ? ` · ${u.agency}` : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Role" style={{ whiteSpace: 'nowrap' }}>
                          <span className="pill pill--off">{u.role === 'agent' ? 'Realtor' : 'Buyer'}</span>
                          {u.isOwner && <span className="pill pill--on" style={{ marginLeft: 6 }}>Owner</span>}
                          {u.isAdmin && <span className="pill pill--on" style={{ marginLeft: 6 }}>Admin</span>}
                        </td>
                        <td data-label="Status" style={{ whiteSpace: 'nowrap' }}>
                          <span className={`pill ${u.active ? 'pill--on' : 'pill--off'}`}>{u.active ? 'Active' : 'Suspended'}</span>
                          {u.verified && <span className="pill pill--on" style={{ marginLeft: 6 }}>Verified</span>}
                        </td>
                        <td className="td--act" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {u.role === 'agent' && (
                            <>
                              <button className="btn btn--sm btn--ghost"
                                onClick={() => confirmAct(
                                  {
                                    title: u.verified ? `Remove ${u.name}'s badge?` : `Verify ${u.name}?`,
                                    text: u.verified ? undefined : 'Confirm the licence and ID have been checked.',
                                    confirmLabel: u.verified ? 'Unverify' : 'Verify',
                                    danger: u.verified,
                                  },
                                  { kind: 'profile', id: u.id, verified: !u.verified, targetName: u.name },
                                  u.verified ? 'Verification removed' : `${u.name} verified`,
                                )}>
                                {u.verified ? 'Unverify' : 'Verify'}
                              </button>{' '}
                            </>
                          )}
                          {u.id !== session.id && (
                            <>
                              <button className="btn btn--sm btn--ghost"
                                onClick={() => confirmAct(
                                  {
                                    title: u.isAdmin ? `Remove admin rights from ${u.name}?` : `Make ${u.name} an admin?`,
                                    text: u.isAdmin
                                      ? 'They lose access to this panel.'
                                      : 'They will be able to hide listings, suspend accounts and delete reviews.',
                                    confirmLabel: u.isAdmin ? 'Revoke' : 'Make admin',
                                    danger: u.isAdmin,
                                    reasonRequired: true,
                                  },
                                  { kind: 'profile', id: u.id, isAdmin: !u.isAdmin, targetName: u.name },
                                  u.isAdmin ? 'Admin rights removed' : `${u.name} is an admin now`,
                                )}>
                                {u.isAdmin ? 'Revoke admin' : 'Make admin'}
                              </button>{' '}
                            </>
                          )}
                          <button className="btn btn--sm btn--danger"
                            onClick={() => confirmAct(
                              {
                                title: u.active ? `Suspend ${u.name}?` : `Restore ${u.name}?`,
                                text: u.active
                                  ? 'They cannot sign in, and their listings drop out of search until restored.'
                                  : 'They can sign in again and their listings come back.',
                                confirmLabel: u.active ? 'Suspend' : 'Restore',
                                danger: u.active,
                                reasonRequired: u.active,
                              },
                              { kind: 'profile', id: u.id, active: !u.active, targetName: u.name },
                              u.active ? 'Account suspended' : 'Account restored',
                            )}>
                            {u.active ? 'Suspend' : 'Restore'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {more(filteredUsers.length)}
              </>
            )}
          </div>
        )}

        {tab === 'reviews' && (
          <div className="panel">
            <div className="fgroup__head">
              <h3>Reviews</h3>
              <span className="muted small">{busy ? 'Loading…' : `${reviews.length} total`}</span>
            </div>
            {reviews.length === 0 ? (
              <div className="empty"><div className="empty__ico"><Icon name="star" size={40} /></div>No reviews yet</div>
            ) : reviews.slice(0, shown).map((r) => (
              <div key={r.id} className="lead">
                <div>
                  <b>{r.authorName}</b> <span className="muted">→ {r.agentName}</span>
                  <span className="pill pill--off" style={{ marginLeft: 8 }}>{r.rating} / 5</span>
                  {r.body && <p className="muted small" style={{ margin: '6px 0 0' }}>{r.body}</p>}
                  <div className="tiny muted" style={{ marginTop: 4 }}>{fmtDate(r.createdAt)}</div>
                </div>
                <button className="btn btn--sm btn--danger"
                  onClick={() => confirmAct(
                    {
                      title: 'Delete this review?',
                      text: `${r.authorName} → ${r.agentName}. The rating is recalculated and the text is gone for good.`,
                      confirmLabel: 'Delete',
                      danger: true,
                      reasonRequired: true,
                    },
                    { kind: 'review', id: r.id, remove: true, targetName: `${r.authorName} → ${r.agentName}` },
                    'Review deleted',
                  )}>
                  Delete
                </button>
              </div>
            ))}
            {more(reviews.length)}
          </div>
        )}

        {tab === 'log' && (
          <div className="panel">
            <div className="fgroup__head">
              <h3>Admin log</h3>
              <span className="muted small">{busy ? 'Loading…' : `${log.length} entries`}</span>
            </div>
            <p className="muted small" style={{ marginBottom: 12 }}>
              Append-only: every moderation action with who did it and why. Nothing here can be edited or removed.
            </p>
            {log.length === 0 ? (
              <div className="empty"><div className="empty__ico"><Icon name="list" size={40} /></div>
                {busy ? 'Loading…' : 'Nothing logged yet'}</div>
            ) : (
              <>
                {log.slice(0, shown).map((e) => (
                  <div key={e.id} className="lead">
                    <div>
                      <span className="pill pill--off">{e.action}</span>{' '}
                      <b>{e.targetName || e.targetId?.slice(0, 8) || '—'}</b>
                      <div className="tiny muted" style={{ marginTop: 3 }}>
                        {e.actorName || 'admin'} · {fmtDate(e.createdAt)}
                      </div>
                      {e.reason && <p className="muted small" style={{ margin: '6px 0 0' }}>“{e.reason}”</p>}
                    </div>
                  </div>
                ))}
                {more(log.length)}
              </>
            )}
          </div>
        )}
      </div>

      <ConfirmAction ask={ask} onClose={() => setAsk(null)} />
    </div>
  );
}
