'use client';
import Link from 'next/link';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { toast } from './Toaster';
import type { Agency, Agent } from '@/lib/types';
import Avatar from './Avatar';
import TeamInvites from './TeamInvites';
import { AGENCY_ROLES, agencyRoleOf, roleLabel, type AgencyRole } from '@/lib/teamRoles';

type Member = Agent & { listings?: number };
type Team = { agency: Agency; isOwner: boolean; active: boolean };

const SWATCHES = ['#16305c', '#ff5a00', '#a4145a', '#1b2450', '#0f766e', '#2b2b30', '#7c3aed', '#b45309'];

export default function AgencyPanel({ meId, onChanged }: { meId: string; onChanged: () => void }) {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [adding, setAdding] = useState<'create' | 'join' | null>(null);
  // картка команди відкривається лише кліком по самій команді у «Your teams»
  const [open, setOpen] = useState(false);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<AgencyRole>('agent');
  const [brand, setBrand] = useState('#16305c');
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [d, t] = await Promise.all([
      fetch('/api/agency/members').then((r) => r.json()),
      fetch('/api/agency/teams').then((r) => r.json()),
    ]);
    setTeams(t.teams ?? []);
    setAgency(d.agency ?? null);
    setMembers(d.members ?? []);
    setInviteCode(d.inviteCode ?? null);
    setMyRole(d.myRole ?? 'agent');
    if (d.agency) setBrand(d.agency.brand);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // після зміни команди оновлюємо й серверні частини (бокове меню, сесію)
  const changed = () => { setAdding(null); setOpen(false); load(); onChanged(); router.refresh(); };

  async function switchTeam(t: Team) {
    const res = await fetch('/api/agency/teams', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agencyId: t.agency.id }),
    });
    const d = await res.json();
    if (!res.ok) return toast(d.error ?? 'Could not switch');
    toast(`Now working in ${t.agency.name}`);
    changed();
    setOpen(true);
  }

  const me = members.find((m) => m.id === meId);
  const isOwner = Boolean(me?.isOwner && agency);
  // команду ведуть власник і менеджер (0055); менеджер не чіпає власників
  const canTeam = Boolean(agency) && (isOwner || myRole === 'manager');
  const canEdit = (m: Member) => isOwner || (canTeam && !m.isOwner);

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
    toast(teams.length
      ? `${d.agency.name} is live — new listings you add now go under it`
      : `${d.agency.name} is live — your listings now publish under it`);
    changed();
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
    changed();
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

  async function setRole(m: Member, role: AgencyRole) {
    const res = await fetch(`/api/agency/members/${m.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    const d = await res.json().catch(() => ({}));
    toast(res.ok ? `${m.name} is now ${roleLabel(role).toLowerCase()}` : d.error ?? 'Not allowed');
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
    const next = teams.find((t) => !t.active);
    if (!confirm(next
      ? `Leave ${agency?.name}? Your listings there go back to your own name and the dashboard switches to ${next.agency.name}.`
      : `Leave ${agency?.name}? You keep your account and go back to listing independently.`)) return;
    const res = await fetch('/api/agency/leave', { method: 'POST' });
    const d = await res.json();
    if (!res.ok) return toast(d.error);
    const rest = teams.length > 1;
    toast(d.closed
      ? (rest ? 'Agency closed' : 'Agency closed — you are independent again')
      : 'You left the agency');
    changed();
  }

  if (loading) return <div className="panel">Loading agency…</div>;

  const createForm = (
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
  );

  const joinForm = (
    <form onSubmit={join} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      <input className="input" name="inviteCode" placeholder="ABCD-2345" style={{ maxWidth: 220 }} required />
      <button className="btn btn--primary">Join agency</button>
    </form>
  );

  /* ---------- незалежний ріелтор ---------- */
  if (!agency) {
    return (
      <>
        <div className="panel">
          <h3>Open your own agency</h3>
          <p className="muted small" style={{ margin: '8px 0 16px' }}>
            You become the owner: your listings move under the agency brand, you get an invite code for other
            realtors, and you can edit everyone in the team. You can run several agencies from this one account
            and close any of them at any time.
          </p>
          {createForm}
        </div>

        <div className="panel" style={{ marginTop: 20 }}>
          <h3>Or join an existing one</h3>
          <p className="muted small" style={{ margin: '8px 0 14px' }}>
            Ask the agency for their invite code. Your listings then publish under their brand and their owner can
            help manage them.
          </p>
          {joinForm}
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
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="fgroup__head">
          <h3>Your teams</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={`btn btn--sm ${adding === 'create' ? '' : 'btn--ghost'}`}
              onClick={() => setAdding(adding === 'create' ? null : 'create')}>
              <Icon name="plus" size={14} /> New team
            </button>
            <button className={`btn btn--sm ${adding === 'join' ? '' : 'btn--ghost'}`}
              onClick={() => setAdding(adding === 'join' ? null : 'join')}>
              Join with a code
            </button>
          </div>
        </div>
        <div className="team-list">
          {teams.map((t) => (
            <button key={t.agency.id} type="button"
              className={`team-row ${t.active ? 'is-active' : ''} ${t.active && open ? 'is-open' : ''}`}
              aria-expanded={t.active ? open : undefined}
              onClick={() => (t.active ? setOpen(!open) : switchTeam(t))}>
              <span className="team-row__dot" style={{ background: t.agency.brand }} />
              <span className="team-row__name">{t.agency.name}</span>
              <span className={`pill ${t.isOwner ? 'pill--on' : 'pill--off'}`}>{t.isOwner ? 'Owner' : 'Agent'}</span>
              <span className="tiny muted team-row__act">
                {t.active ? (open ? 'Close' : t.isOwner ? 'Manage team' : 'Open team') : 'Switch & open'}
              </span>
              <Icon name="arrowDown" size={16} className="team-row__chev" />
            </button>
          ))}
        </div>
        <p className="tiny muted" style={{ marginTop: 10 }}>
          The dashboard shows the team you are working in. New listings and developments go under it;
          the ones you already published stay with their team.
        </p>
        {adding === 'create' && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ margin: '0 0 12px' }}>New team</h4>
            {createForm}
          </div>
        )}
        {adding === 'join' && (
          <div style={{ marginTop: 16 }}>
            <p className="muted small" style={{ margin: '0 0 10px' }}>Enter the invite code you got from the agency.</p>
            {joinForm}
          </div>
        )}
      </div>

      {open && (<>
      <div className="panel">
        <div className="fgroup__head">
          <h3>{canTeam ? 'Agency profile' : agency.name}</h3>
          <span className="muted small">{members.length} {members.length === 1 ? 'agent' : 'agents'}</span>
        </div>

        {canTeam ? (
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

      {canTeam && <TeamInvites agencyName={agency.name} canInviteOwner={isOwner} />}

      {canTeam && inviteCode && (
        <div className="panel" style={{ marginTop: 20 }}>
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

      <div className="panel" style={{ marginTop: 20 }}>
        <h3 style={{ marginBottom: 12 }}>Team</h3>
        <table className="table">
          <thead><tr><th>Agent</th><th>Listings</th><th>Role</th><th></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <Fragment key={m.id}>
                <tr>
                  <td data-label="Agent">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <Avatar src={m.avatar} name={m.name} style={{ width: 34, height: 34, fontSize: 12 }} />
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
                  <td data-label="Listings">{m.listings ?? 0}</td>
                  <td data-label="Role">
                    {canEdit(m) && m.id !== meId ? (
                      <select className="input input--sm role-select" value={agencyRoleOf(m)} aria-label={`Role of ${m.name}`}
                        onChange={(e) => setRole(m, e.target.value as AgencyRole)}>
                        {AGENCY_ROLES.filter((r) => isOwner || r.role !== 'owner').map((r) => (
                          <option key={r.role} value={r.role} title={r.hint}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`pill ${m.isOwner ? 'pill--on' : 'pill--off'}`}>{roleLabel(agencyRoleOf(m))}</span>
                    )}
                  </td>
                  <td className="td--act" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {canEdit(m) && (
                      <>
                        <button className="btn btn--sm btn--ghost btn--icon" title={editing === m.id ? 'Close' : 'Edit'}
                          aria-label={editing === m.id ? 'Close' : 'Edit'}
                          onClick={() => setEditing(editing === m.id ? null : m.id)}>
                          <Icon name={editing === m.id ? 'close' : 'pencil'} size={16} />
                        </button>{' '}
                        {isOwner && !m.isOwner && <button className="btn btn--sm btn--danger btn--icon" title="Remove from the team" aria-label="Remove from the team" onClick={() => remove(m)}><Icon name="trash" size={16} /></button>}
                      </>
                    )}
                  </td>
                </tr>

                {canEdit(m) && editing === m.id && (
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

        <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn--danger btn--sm" onClick={leave}>Leave {agency.name}</button>
          <span className="tiny muted">
            You keep your account and listings — the ones in {agency.name} simply go back to your own name.
            {isOwner && ' As the last owner, hand the role to someone first (or leave to close the agency).'}
          </span>
        </div>
      </div>
      </>)}
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
