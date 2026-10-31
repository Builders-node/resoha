'use client';
import { useCallback, useEffect, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { fmtDate } from '@/lib/format';
import type { Invite } from '@/lib/team';
import { AGENCY_ROLES, roleLabel, type AgencyRole } from '@/lib/teamRoles';
import { useT } from './LangProvider';

const STATUS: Record<Invite['status'], [string, string]> = {
  pending: ['Waiting', 'pill--on'], accepted: ['Joined', 'pill--off'], revoked: ['Withdrawn', 'pill--off'], expired: ['Expired', 'pill--off'],
};

/** Запросити колегу листом із посиланням (0055) і стежити за запрошеннями. Для власника й менеджера. */
export default function TeamInvites({ agencyName, canInviteOwner }: { agencyName: string; canInviteOwner: boolean }) {
  const t = useT();
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
    if (!res.ok) return toast(d.error ?? t('Could not send the invitation'));
    toast(t('Invitation sent to {email}', { email }));
    form.reset();
    load();
  }

  async function revoke(i: Invite) {
    if (!confirm(t('Withdraw the invitation for {email}? The link in the email stops working.', { email: i.email }))) return;
    const res = await fetch(`/api/agency/invites/${i.id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    toast(res.ok ? t('Invitation withdrawn') : d.error ?? t('Not allowed'));
    load();
  }

  function copy(i: Invite) {
    navigator.clipboard?.writeText(`${window.location.origin}/invite/${i.token}`);
    toast(t('Invitation link copied'));
  }

  const roles = AGENCY_ROLES.filter((r) => canInviteOwner || r.role !== 'owner');
  return (
    <div className="panel" style={{ marginTop: 20 }}>
      <h3>{t('Invite by email')}</h3>
      <p className="muted small" style={{ margin: '6px 0 14px' }}>
        We email a personal link to join {agencyName}. It works once, for 14 days.
      </p>
      <form className="team-invite" onSubmit={invite}>
        <input className="input" name="email" type="email" required maxLength={200} placeholder="colleague@agency.com" aria-label={t('Email')} />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as AgencyRole)} aria-label={t('Role')}>
          {roles.map((r) => <option key={r.role} value={r.role}>{t(r.label)}</option>)}
        </select>
        <button className="btn btn--primary" disabled={sending}>{t(sending ? 'Sending…' : 'Send invitation')}</button>
      </form>
      <p className="tiny muted" style={{ marginTop: 8 }}>{t(AGENCY_ROLES.find((r) => r.role === role)?.hint ?? '')}.</p>

      {items.length > 0 && (
        <table className="table" style={{ marginTop: 14 }}>
          <thead><tr><th>{t('Email')}</th><th>{t('Role')}</th><th>{t('Sent')}</th><th>{t('Status')}</th><th></th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td data-label={t('Email')}>{i.email}</td>
                <td data-label={t('Role')}>{t(roleLabel(i.role))}</td>
                <td data-label={t('Sent')}>{fmtDate(i.createdAt)}</td>
                <td data-label={t('Status')}><span className={`pill ${STATUS[i.status][1]}`}>{t(STATUS[i.status][0])}</span></td>
                <td className="td--act" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {i.status === 'pending' && (
                    <>
                      <button className="btn btn--sm btn--ghost" onClick={() => copy(i)}>{t('Copy link')}</button>{' '}
                      <button className="btn btn--sm btn--ghost btn--icon" title={t('Withdraw')} aria-label={t('Withdraw')} onClick={() => revoke(i)}>
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
