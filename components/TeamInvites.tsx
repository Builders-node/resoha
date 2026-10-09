'use client';
import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { fmtDate } from '@/lib/format';
import type { Invite } from '@/lib/team';
import { AGENCY_ROLES, roleLabel, type AgencyRole } from '@/lib/teamRoles';

const STATUS: Record<Invite['status'], [string, string]> = {
  pending: ['Waiting', 'pill--on'], accepted: ['Joined', 'pill--off'], revoked: ['Withdrawn', 'pill--off'], expired: ['Expired', 'pill--off'],
};

/** Запросити колегу листом із посиланням (0055) і стежити за запрошеннями. Для власника й менеджера. */
export default function TeamInvites({ agencyName, canInviteOwner }: { agencyName: string; canInviteOwner: boolean }) {
  const [items, setItems] = useState<Invite[]>([]);
  const [role, setRole] = useState<AgencyRole>('agent');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    fetch('/api/agency/invites').then((r) => r.json()).catch(() => ({}))
      .then((d) => setItems(d.items ?? []));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get('email') ?? '');
    setSending(true);
    const res = await fetch('/api/agency/invites', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, role }),
    });
    const d = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) return toast(d.error ?? 'Could not send the invitation');
    toast(`Invitation sent to ${email}`);
    form.reset();
    load();
  }

  async function revoke(i: Invite) {
    if (!confirm(`Withdraw the invitation for ${i.email}? The link in the email stops working.`)) return;
    const res = await fetch(`/api/agency/invites/${i.id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    toast(res.ok ? 'Invitation withdrawn' : d.error ?? 'Not allowed');
    load();
  }

  function copy(i: Invite) {
    navigator.clipboard?.writeText(`${window.location.origin}/invite/${i.token}`);
    toast('Invitation link copied');
  }

  const roles = AGENCY_ROLES.filter((r) => canInviteOwner || r.role !== 'owner');
  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h3>Invite by email</h3>
      <p className="muted small" style={{ margin: '6px 0 14px' }}>
        We email a personal link to join {agencyName}. It works once, for 14 days.
      </p>
      <form className="team-invite" onSubmit={invite}>
        <input className="input" name="email" type="email" required maxLength={200} placeholder="colleague@agency.com" aria-label="Email" />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as AgencyRole)} aria-label="Role">
          {roles.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
        </select>
        <button className="btn btn--primary" disabled={sending}>{sending ? 'Sending…' : 'Send invitation'}</button>
      </form>
      <p className="tiny muted" style={{ marginTop: 8 }}>{AGENCY_ROLES.find((r) => r.role === role)?.hint}.</p>

      {items.length > 0 && (
        <table className="table" style={{ marginTop: 14 }}>
          <thead><tr><th>Email</th><th>Role</th><th>Sent</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td data-label="Email">{i.email}</td>
                <td data-label="Role">{roleLabel(i.role)}</td>
                <td data-label="Sent">{fmtDate(i.createdAt)}</td>
                <td data-label="Status"><span className={`pill ${STATUS[i.status][1]}`}>{STATUS[i.status][0]}</span></td>
                <td className="td--act" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {i.status === 'pending' && (
                    <>
                      <button className="btn btn--sm btn--ghost" onClick={() => copy(i)}>Copy link</button>{' '}
                      <button className="btn btn--sm btn--ghost btn--icon" title="Withdraw" aria-label="Withdraw" onClick={() => revoke(i)}>
                        <Icon name="close" size={16} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
