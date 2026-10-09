'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from './Toaster';
import { openAuth } from '@/lib/auth-modal';
import type { InviteInfo } from '@/lib/team';
import { AGENCY_ROLES } from '@/lib/teamRoles';

/** Прийняти запрошення: потрібен акаунт ріелтора; без входу — відкриваємо вхід чи реєстрацію. */
export default function InviteAccept({ token, info, me }: {
  token: string;
  info: InviteInfo;
  me: { role: string; email: string; inAgency: boolean } | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const role = AGENCY_ROLES.find((r) => r.role === info.role);

  async function accept() {
    setBusy(true);
    const res = await fetch('/api/agency/invites/accept', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? 'Could not join');
    toast(`Welcome to ${info.agency.name}`);
    router.push('/agent?tab=team');
    router.refresh();
  }

  const closed = info.status !== 'pending';
  return (
    <>
      <h1 style={{ marginTop: 12 }}>Join {info.agency.name}</h1>
      <p className="muted" style={{ margin: '10px 0 6px' }}>
        {info.inviter ? `${info.inviter} invited you` : 'You are invited'} to the team as <b>{role?.label ?? 'Agent'}</b>.
      </p>
      {role && <p className="small muted" style={{ marginBottom: 24 }}>{role.hint}.</p>}

      {closed ? (
        <p className="note-ok" style={{ justifyContent: 'center' }}>
          {info.status === 'accepted' ? 'This invitation has already been used.'
            : info.status === 'expired' ? 'This invitation has expired. Ask the agency for a new one.'
              : 'This invitation was withdrawn.'}
        </p>
      ) : !me ? (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => openAuth('signup', 'agent')}>Create an agent account</button>
          <button type="button" className="btn btn--ghost btn--lg" onClick={() => openAuth('login', 'agent')}>Sign in</button>
        </div>
      ) : me.inAgency ? (
        <Link className="btn btn--primary btn--lg" href="/agent?tab=team">You are in this team — open it</Link>
      ) : me.role !== 'agent' ? (
        <p className="note-ok" style={{ justifyContent: 'center' }}>
          You are signed in with a buyer account. Sign in with an agent account to join the agency.
        </p>
      ) : (
        <>
          <button type="button" className="btn btn--primary btn--lg" disabled={busy} onClick={accept}>
            {busy ? 'Joining…' : `Join ${info.agency.name}`}
          </button>
          {info.email && me.email && info.email.toLowerCase() !== me.email.toLowerCase() && (
            <p className="tiny muted" style={{ marginTop: 12 }}>
              The invitation was sent to {info.email}; you are signed in as {me.email}.
            </p>
          )}
        </>
      )}
    </>
  );
}
