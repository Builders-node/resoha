'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';

type Mode = 'buyer' | 'agent' | 'agency';

const MODES: { v: Mode; label: string; hint: string }[] = [
  { v: 'buyer', label: 'Buyer', hint: 'Save listings and searches while you shop the island.' },
  { v: 'agent', label: 'Realtor', hint: 'Publish your own listings. Join an agency later, or right now with an invite code.' },
  { v: 'agency', label: 'Agency', hint: 'Create an agency account, invite your realtors, and list under one brand.' },
];

export function LoginForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? 'Could not sign in'); return; }
    toast(`Signed in as ${data.session.name}`);
    router.push(data.session.role === 'agent' ? '/agent' : '/account');
    router.refresh();
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <h1>Sign in</h1>
        <p className="muted" style={{ margin: '8px 0 20px' }}>Welcome back to Resoha Roatán.</p>

        <form onSubmit={submit} className="auth__form">
          <div className="field"><label>Email</label>
            <input className="input" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></div>
          <div className="field"><label>Password</label>
            <input className="input" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" /></div>
          {error && <div className="auth__error">{error}</div>}
          <button className="btn btn--primary btn--lg btn--block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>

        <p className="small muted" style={{ marginTop: 18, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>No account yet? <Link className="link-accent" href="/signup">Create one <Icon name="arrowRight" size={15} /></Link></span>
          <Link className="link-accent" href="/forgot">Forgot password?</Link>
        </p>

        <div className="auth__demo">
          <b className="small">Demo accounts</b>
          <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.7 }}>
            Agency owner — <code>marla@islandliferoatan.com</code><br />
            Agency realtor — <code>kevin@islandliferoatan.com</code><br />
            Independent realtor — <code>tanya@roatanmail.com</code><br />
            Buyer — <code>dana.whitfield@example.com</code><br />
            Password for all — <code>demo1234</code>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SignupForm({ initialMode = 'buyer' }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    const res = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        name: fd.get('name'), email: fd.get('email'), password: fd.get('password'),
        phone: fd.get('phone'), agencyName: fd.get('agencyName'), inviteCode: fd.get('inviteCode'),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? 'Could not create the account'); return; }
    if (data.pendingConfirmation) { setPending(data.email); return; }
    if (data.warning) toast(data.warning);
    else toast(mode === 'agency' ? 'Agency created' : 'Account created');
    router.push(mode === 'buyer' ? '/account' : '/agent');
    router.refresh();
  }

  const active = MODES.find((m) => m.v === mode)!;

  if (pending) {
    return (
      <div className="auth">
        <div className="auth__card" style={{ textAlign: 'center' }}>
          <div className="empty__ico"><Icon name="inbox" size={40} /></div>
          <h1 style={{ fontSize: 24 }}>Confirm your email</h1>
          <p className="muted" style={{ margin: '10px 0 20px' }}>
            We sent a confirmation link to <b>{pending}</b>. Open it, then sign in — your account is already created.
          </p>
          <Link className="btn btn--primary btn--lg btn--block" href="/login">Go to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="auth__card auth__card--wide">
        <h1>Create an account</h1>

        <div className="chip-row" style={{ margin: '16px 0 10px' }}>
          {MODES.map((m) => (
            <button key={m.v} type="button" className={`chip-btn ${mode === m.v ? 'is-on' : ''}`}
              onClick={() => setMode(m.v)}>{m.label}</button>
          ))}
        </div>
        <p className="muted small" style={{ marginBottom: 20 }}>{active.hint}</p>

        <form onSubmit={submit} className="auth__form">
          {mode === 'agency' && (
            <div className="field"><label>Agency name</label>
              <input className="input" name="agencyName" required placeholder="Blue Harbour Estates" /></div>
          )}

          <div className="field"><label>{mode === 'agency' ? 'Owner name' : 'Full name'}</label>
            <input className="input" name="name" required placeholder="Marla Bennett" /></div>

          <div className="auth__row">
            <div className="field"><label>Email</label>
              <input className="input" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></div>
            <div className="field"><label>Phone / WhatsApp</label>
              <input className="input" name="phone" placeholder="+504 9812-4471" /></div>
          </div>

          <div className="field"><label>Password</label>
            <input className="input" name="password" type="password" required minLength={8}
              autoComplete="new-password" placeholder="at least 8 characters" /></div>

          {mode === 'agent' && (
            <div className="field">
              <label>Agency invite code — optional</label>
              <input className="input" name="inviteCode" placeholder="ABCD-2345" />
              <span className="tiny muted">
                Have one from an agency? Enter it and your listings go out under their brand. You can also join later
                from your dashboard, or stay independent.
              </span>
            </div>
          )}

          {error && <div className="auth__error">{error}</div>}

          <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
            {busy ? 'Creating…' : mode === 'agency' ? 'Create agency account' : 'Create account'}
          </button>
        </form>

        <p className="small muted" style={{ marginTop: 18 }}>
          Already registered? <Link className="link-accent" href="/login">Sign in <Icon name="arrowRight" size={15} /></Link>
        </p>
      </div>
    </div>
  );
}


export function ForgotForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    setBusy(true); setError(null);
    const res = await fetch('/api/auth/forgot', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).error ?? 'Could not send the link'); return; }
    setSent(true);
  }

  return (
    <div className="auth">
      <div className="auth__card">
        {sent ? (
          <>
            <div className="empty__ico"><Icon name="inbox" size={40} /></div>
            <h1 style={{ fontSize: 24 }}>Check your email</h1>
            <p className="muted" style={{ margin: '10px 0 20px' }}>
              If that address has an account, a reset link is on its way. The link signs you in once and
              takes you straight to a new-password form.
            </p>
            <Link className="btn btn--ghost btn--block" href="/login">Back to sign in</Link>
          </>
        ) : (
          <>
            <h1>Reset your password</h1>
            <p className="muted" style={{ margin: '8px 0 20px' }}>We&apos;ll email you a link to set a new one.</p>
            <form onSubmit={submit} className="auth__form">
              <div className="field"><label>Email</label>
                <input className="input" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></div>
              {error && <div className="auth__error">{error}</div>}
              <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
            <p className="small muted" style={{ marginTop: 18 }}>
              <Link className="link-accent" href="/login">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function ResetForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get('password') !== fd.get('confirm')) { setError('The two passwords do not match'); return; }
    setBusy(true); setError(null);
    const res = await fetch('/api/auth/reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: fd.get('password') }),
    });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).error ?? 'Could not update the password'); return; }
    toast('Password updated');
    router.push('/account');
    router.refresh();
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <h1>Set a new password</h1>
        <p className="muted" style={{ margin: '8px 0 20px' }}>You are signed in from the email link — pick a new password.</p>
        <form onSubmit={submit} className="auth__form">
          <div className="field"><label>New password</label>
            <input className="input" name="password" type="password" required minLength={8}
              autoComplete="new-password" placeholder="at least 8 characters" /></div>
          <div className="field"><label>Repeat it</label>
            <input className="input" name="confirm" type="password" required minLength={8} autoComplete="new-password" /></div>
          {error && <div className="auth__error">{error}</div>}
          <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </div>
    </div>
  );
}
