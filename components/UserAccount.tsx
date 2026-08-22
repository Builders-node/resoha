'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AvatarPicker from './AvatarPicker';
import Icon, { HeartIcon } from './Icon';
import ListingCard from './ListingCard';
import { toast } from './Toaster';
import { fmtDate } from '@/lib/format';
import type { Lead, Listing, SavedSearch, Session } from '@/lib/types';

type Tab = 'fav' | 'searches' | 'enquiries' | 'profile';

export default function UserAccount({ session, user }: {
  session: Session;
  user: { email: string; phone: string };
}) {
  const [tab, setTab] = useState<Tab>('fav');
  const [favs, setFavs] = useState<Listing[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatar, setAvatar] = useState(session.avatar);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [f, s, l] = await Promise.all([
      fetch('/api/favorites').then((r) => r.json()),
      fetch('/api/saved-searches').then((r) => r.json()),
      fetch('/api/leads').then((r) => r.json()),
    ]);
    setFavs(f.items ?? []); setFavIds(f.ids ?? []); setSearches(s.items ?? []);
    setLeads(l.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function removeSearch(id: string) {
    await fetch(`/api/saved-searches/${id}`, { method: 'DELETE' });
    toast('Search removed');
    load();
  }

  return (
    <div className="wrap dash">
      <nav className="sidenav">
        <a className={tab === 'fav' ? 'is-active' : ''} onClick={() => setTab('fav')}>
          <HeartIcon filled size={18} /> Saved {favIds.length > 0 && <span className="pill pill--off">{favIds.length}</span>}
        </a>
        <a className={tab === 'searches' ? 'is-active' : ''} onClick={() => setTab('searches')}><Icon name="bell" size={18} /> Saved searches</a>
        <a className={tab === 'enquiries' ? 'is-active' : ''} onClick={() => setTab('enquiries')}>
          <Icon name="chat" size={18} /> My enquiries {leads.length > 0 && <span className="pill pill--off">{leads.length}</span>}
        </a>
        <a className={tab === 'profile' ? 'is-active' : ''} onClick={() => setTab('profile')}><Icon name="user" size={18} /> Profile</a>
      </nav>

      <div>
        <div className="profile-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt={session.name} />
          <div>
            <h2>{session.name}</h2>
            <div className="muted">{user.email} · {user.phone}</div>
            <div className="small muted" style={{ marginTop: 4 }}>Buyer account</div>
          </div>
          <Link className="btn btn--primary" href="/listings" style={{ marginLeft: 'auto' }}>Browse listings</Link>
        </div>

        {tab === 'fav' && (
          loading ? <div className="empty">Loading…</div> :
          favs.length === 0 ? (
            <div className="panel"><div className="empty"><div className="empty__ico"><HeartIcon size={40} /></div>
              No saved properties yet.<br />
              <Link href="/listings" className="link-accent">Start browsing <Icon name="arrowRight" size={16} /></Link>
            </div></div>
          ) : (
            <div className="grid grid--3">
              {favs.map((l) => <ListingCard key={l.id} listing={l} isFav />)}
            </div>
          )
        )}

        {tab === 'searches' && (
          <div className="panel">
            <h3 style={{ marginBottom: 4 }}>Saved searches</h3>
            <p className="muted small" style={{ marginBottom: 16 }}>
              Each one keeps its filters and shows how many properties match right now.
            </p>
            {searches.length === 0 ? (
              <div className="empty"><div className="empty__ico"><Icon name="bell" size={40} /></div>No saved searches. Use “Save search” on the results page.</div>
            ) : searches.map((s) => (
              <div key={s.id} className="lead">
                <div>
                  <b>{s.title}</b>
                  {typeof s.total === 'number' && (
                    <>
                      {' '}<span className="pill pill--off">{s.total} {s.total === 1 ? 'match' : 'matches'}</span>
                      {!!s.fresh && <span className="pill pill--on" style={{ marginLeft: 6 }}>+{s.fresh} new</span>}
                    </>
                  )}
                  <div className="tiny muted" style={{ marginTop: 4 }}>
                    Saved {fmtDate(s.createdAt)}
                    {!!s.fresh && ` · ${s.fresh} added since then`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link className="btn btn--sm btn--ghost" href={`/listings?${s.query}`}>Open</Link>
                  <button className="btn btn--sm btn--danger" onClick={() => removeSearch(s.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'enquiries' && (
          <div className="panel">
            <h3 style={{ marginBottom: 4 }}>My enquiries</h3>
            <p className="muted small" style={{ marginBottom: 16 }}>
              Everything you sent from a property page. “Handled” means the agent has worked it.
            </p>
            {leads.length === 0 ? (
              <div className="empty">
                <div className="empty__ico"><Icon name="chat" size={40} /></div>
                No enquiries yet. Open a listing and ask the agent for a viewing.
              </div>
            ) : leads.map((l) => (
              <div key={l.id} className="lead">
                <div>
                  <Link href={`/listings/${l.listingId}`} style={{ fontWeight: 700 }}>
                    {l.listingTitle || 'Listing'}
                  </Link>
                  <span className={`pill ${l.status === 'new' ? 'pill--off' : 'pill--on'}`} style={{ marginLeft: 8 }}>
                    {l.status === 'new' ? 'Awaiting reply' : 'Handled'}
                  </span>
                  {l.message && <p className="muted small" style={{ margin: '6px 0 0' }}>{l.message}</p>}
                  <div className="tiny muted" style={{ marginTop: 6 }}>
                    Sent {fmtDate(l.createdAt)}{l.agentName && ` · agent: ${l.agentName}`}
                  </div>
                </div>
                <Link className="btn btn--sm btn--ghost" href={`/listings/${l.listingId}`}>Open listing</Link>
              </div>
            ))}
          </div>
        )}

        {tab === 'profile' && (
          <div className="panel">
            <h3 style={{ marginBottom: 18 }}>My details</h3>
            <div style={{ marginBottom: 18 }}>
              <AvatarPicker src={avatar} name={session.name} onChanged={setAvatar} />
            </div>
            <form className="form-grid" onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setSaving(true);
              const res = await fetch('/api/profile', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: fd.get('name'), phone: fd.get('phone'), whatsapp: fd.get('phone'),
                }),
              });
              setSaving(false);
              toast(res.ok ? 'Details saved' : 'Could not save');
            }}>
              <div className="field"><label>Name</label><input className="input" name="name" defaultValue={session.name} /></div>
              <div className="field"><label>Phone / WhatsApp</label><input className="input" name="phone" defaultValue={user.phone} /></div>
              <div className="field full"><label>Email</label>
                <input className="input" defaultValue={user.email} disabled />
                <span className="tiny muted">Email is managed by your login — change it from Supabase Auth.</span>
              </div>
              <div className="full"><button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button></div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
