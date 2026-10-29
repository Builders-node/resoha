'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from './Toaster';
import { openAuth } from '@/lib/auth-modal';
import type { HandoverInfo } from '@/lib/developerHandover';

/** Забрати профіль компанії: без входу — відкриваємо реєстрацію чи вхід. */
export default function HandoverAccept({ token, info, signedIn }: {
  token: string;
  info: HandoverInfo;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const name = info.developer.name;

  async function accept() {
    setBusy(true);
    const res = await fetch('/api/developers/handover/accept', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(d.error ?? 'Could not take over the profile');
    toast(`${name} is now managed by your account`);
    router.push('/developer');
    router.refresh();
  }

  return (
    <>
      <h1 style={{ marginTop: 12 }}>Manage {name} on Hogarli</h1>
      <p className="muted" style={{ margin: '10px 0 24px' }}>
        {info.from ? `${info.from} is handing over` : 'You are invited to take over'} the company page of <b>{name}</b>.
        After that you edit the logo, contacts and description yourself.
        {!!info.projects && (
          <> Its {plural(info.projects, 'project')}{info.units ? ` and ${plural(info.units, 'unit')} in them` : ''} move
            to your account too.</>
        )}
      </p>

      {info.mine ? (
        <Link className="btn btn--primary btn--lg" href="/developer">This profile is yours — open it</Link>
      ) : info.status !== 'pending' ? (
        <p className="note-ok" style={{ justifyContent: 'center' }}>
          {info.status === 'accepted' ? 'This link has already been used.'
            : info.status === 'expired' ? 'This link has expired. Ask for a new one.'
              : 'This link was replaced by a newer one.'}
        </p>
      ) : !signedIn ? (
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => openAuth('signup', 'agent')}>Create an account</button>
          <button type="button" className="btn btn--ghost btn--lg" onClick={() => openAuth('login', 'agent')}>Sign in</button>
        </div>
      ) : (
        <button type="button" className="btn btn--primary btn--lg" disabled={busy} onClick={accept}>
          {busy ? 'Saving…' : `Take over ${name}`}
        </button>
      )}
      <p className="tiny muted" style={{ marginTop: 18 }}>
        <Link href={`/developers/${info.developer.slug}`} target="_blank">View the public page</Link>
      </p>
    </>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
