'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { DEAL_LABELS, fmtDate, fmtNumber, fmtPrice, photoUrl } from '@/lib/format';
import type { Agency, Agent, Listing, Review, Session } from '@/lib/types';

type Tab = 'overview' | 'listings' | 'agencies' | 'users' | 'reviews';
type Overview = {
  listings: number; hidden: number; agencies: number; reviews: number; leads: number;
  newLeads: number; views: number; agents: number; buyers: number;
  unverifiedAgents: number; suspended: number;
};
type AgencyRowData = { agency: Agency; agents: number; listings: number };

const TABS: { v: Tab; label: string; ico: string }[] = [
  { v: 'overview', label: 'Overview', ico: 'sliders' },
  { v: 'listings', label: 'Listings', ico: 'home' },
  { v: 'agencies', label: 'Agencies', ico: 'building' },
  { v: 'users', label: 'People', ico: 'user' },
  { v: 'reviews', label: 'Reviews', ico: 'star' },
];

export default function AdminPanel({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [agencies, setAgencies] = useState<AgencyRowData[]>([]);
  const [users, setUsers] = useState<Agent[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (which: Tab) => {
    setBusy(true);
    const d = await fetch(`/api/admin?section=${which}`).then((r) => r.json());
    if (which === 'overview') setOverview(d.overview);
    if (which === 'listings') setListings(d.items ?? []);
    if (which === 'agencies') setAgencies(d.items ?? []);
    if (which === 'users') setUsers(d.items ?? []);
    if (which === 'reviews') setReviews(d.items ?? []);
    setBusy(false);
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  async function act(body: Record<string, unknown>, message: string) {
    const res = await fetch('/api/admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    toast(res.ok ? message : d.error ?? 'Not allowed');
    load(tab);
  }

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
                <div className="stat"><span className="muted small">Total views</span><b>{fmtNumber(overview.views)}</b></div>
                <div className="stat"><span className="muted small">Enquiries</span><b>{fmtNumber(overview.leads)}</b></div>
              </div>
              <div className="stats">
                <div className="stat"><span className="muted small">Agencies</span><b>{fmtNumber(overview.agencies)}</b></div>
                <div className="stat"><span className="muted small">Realtors</span><b>{fmtNumber(overview.agents)}</b></div>
                <div className="stat"><span className="muted small">Buyers</span><b>{fmtNumber(overview.buyers)}</b></div>
                <div className="stat"><span className="muted small">Reviews</span><b>{fmtNumber(overview.reviews)}</b></div>
              </div>

              <div className="panel">
                <h3 style={{ marginBottom: 12 }}>Needs attention</h3>
                <div className="lead">
                  <div><b>{overview.unverifiedAgents}</b> realtors are not verified yet
                    <div className="tiny muted">Verified agents get a badge on their card and profile</div></div>
                  <button className="btn btn--sm btn--ghost" onClick={() => setTab('users')}>Review</button>
                </div>
                <div className="lead">
                  <div><b>{overview.newLeads}</b> enquiries still marked new
                    <div className="tiny muted">Across every agency on the platform</div></div>
                </div>
                <div className="lead">
                  <div><b>{overview.suspended}</b> suspended accounts
                    <div className="tiny muted">They cannot sign in until reactivated</div></div>
                  <button className="btn btn--sm btn--ghost" onClick={() => setTab('users')}>Open</button>
                </div>
              </div>
            </>
          ) : <div className="panel">Loading…</div>
        )}

        {tab === 'listings' && (
          <div className="panel">
            <div className="fgroup__head">
              <h3>All listings</h3>
              <span className="muted small">{busy ? 'Loading…' : `${listings.length} total, hidden included`}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Property</th><th>Price</th><th>Views</th><th>State</th><th></th></tr></thead>
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
                      <td style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtPrice(l.price, l.deal)}</td>
                      <td>{fmtNumber(l.views)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className={`pill ${l.active ? 'pill--on' : 'pill--off'}`}>{l.active ? 'Live' : 'Hidden'}</span>
                        {l.featured && <span className="pill pill--on" style={{ marginLeft: 6 }}>Featured</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <button className="btn btn--sm btn--ghost"
                          onClick={() => act({ kind: 'listing', id: l.id, featured: !l.featured },
                            l.featured ? 'Removed from the home page' : 'Featured on the home page')}>
                          {l.featured ? 'Unfeature' : 'Feature'}
                        </button>{' '}
                        <button className="btn btn--sm btn--danger"
                          onClick={() => act({ kind: 'listing', id: l.id, active: !l.active },
                            l.active ? 'Listing taken down' : 'Listing restored')}>
                          {l.active ? 'Take down' : 'Restore'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'agencies' && (
          <div className="panel">
            <h3 style={{ marginBottom: 12 }}>Agencies</h3>
            <table className="table">
              <thead><tr><th>Agency</th><th>Agents</th><th>Listings</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {agencies.map(({ agency, agents, listings: n }) => (
                  <tr key={agency.id}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="agc-dot" style={{ background: agency.brand }} />
                        <div>
                          <Link href={`/agency/${agency.id}`} style={{ fontWeight: 600 }}>{agency.name}</Link>
                          <div className="tiny muted">{agency.email || 'no email'} · joined {fmtDate(agency.createdAt)}</div>
                        </div>
                      </div>
                    </td>
                    <td>{agents}</td>
                    <td>{n}</td>
                    <td>
                      <span className={`pill ${agency.verified ? 'pill--on' : 'pill--off'}`}>
                        {agency.verified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn--sm btn--ghost"
                        onClick={() => act({ kind: 'agency', id: agency.id, verified: !agency.verified },
                          agency.verified ? 'Verification removed' : `${agency.name} verified`)}>
                        {agency.verified ? 'Unverify' : 'Verify'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && (
          <div className="panel">
            <div className="fgroup__head">
              <h3>People</h3>
              <span className="muted small">{busy ? 'Loading…' : `${users.length} accounts`}</span>
            </div>
            <table className="table">
              <thead><tr><th>Account</th><th>Role</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={u.avatar} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {u.role === 'agent' ? <Link href={`/agents/${u.id}`}>{u.name}</Link> : u.name}
                          </div>
                          <div className="tiny muted">{u.email}{u.agencyId ? ` · ${u.agency}` : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="pill pill--off">{u.role === 'agent' ? 'Realtor' : 'Buyer'}</span>
                      {u.isOwner && <span className="pill pill--on" style={{ marginLeft: 6 }}>Owner</span>}
                      {u.isAdmin && <span className="pill pill--on" style={{ marginLeft: 6 }}>Admin</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className={`pill ${u.active ? 'pill--on' : 'pill--off'}`}>{u.active ? 'Active' : 'Suspended'}</span>
                      {u.verified && <span className="pill pill--on" style={{ marginLeft: 6 }}>Verified</span>}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {u.role === 'agent' && (
                        <>
                          <button className="btn btn--sm btn--ghost"
                            onClick={() => act({ kind: 'profile', id: u.id, verified: !u.verified },
                              u.verified ? 'Verification removed' : `${u.name} verified`)}>
                            {u.verified ? 'Unverify' : 'Verify'}
                          </button>{' '}
                        </>
                      )}
                      <button className="btn btn--sm btn--danger"
                        onClick={() => act({ kind: 'profile', id: u.id, active: !u.active },
                          u.active ? 'Account suspended' : 'Account restored')}>
                        {u.active ? 'Suspend' : 'Restore'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            ) : reviews.map((r) => (
              <div key={r.id} className="lead">
                <div>
                  <b>{r.authorName}</b> <span className="muted">→ {r.agentName}</span>
                  <span className="pill pill--off" style={{ marginLeft: 8 }}>{r.rating} / 5</span>
                  {r.body && <p className="muted small" style={{ margin: '6px 0 0' }}>{r.body}</p>}
                  <div className="tiny muted" style={{ marginTop: 4 }}>{fmtDate(r.createdAt)}</div>
                </div>
                <button className="btn btn--sm btn--danger"
                  onClick={() => { if (confirm('Delete this review?')) act({ kind: 'review', id: r.id, remove: true }, 'Review deleted'); }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
