'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import type { AuthMode as Mode, AuthView } from '@/lib/auth-modal';
import { useT } from './LangProvider';

/** Форми входу живуть у модалці (AuthModal): перемикання між ними — без переходу на іншу сторінку. */
type InModal = {
  onSwitch: (view: AuthView) => void;
};

const Switch = ({ to, onSwitch, children }: { to: AuthView; onSwitch: InModal['onSwitch']; children: React.ReactNode }) => (
  <button type="button" className="link-accent linkbtn" onClick={() => onSwitch(to)}>{children}</button>
);

/**
 * Вхід через Google — звичайне посилання: сервер (/api/auth/google) сам веде на Google
 * і назад у /auth/callback. `as` каже, що новий акаунт має стати ріелторським.
 */
function GoogleButton({ next, as }: { next: string; as?: Mode }) {
  const t = useT();
  const q = new URLSearchParams({ next });
  if (as && as !== 'buyer') q.set('as', as);
  return (
    <>
      <a className="btn btn--ghost btn--lg btn--block btn--google" href={`/api/auth/google?${q}`}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.6 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.7c-.5 2.9-2.2 5.4-4.7 7.1l7.6 5.9c4.5-4.1 7-10.2 7-17.5z" />
          <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {t('Continue with Google')}
      </a>
      <div className="auth__or"><span>{t('or')}</span></div>
    </>
  );
}

const MODES: { v: Mode; label: string; hint: string }[] = [
  { v: 'buyer', label: 'Buyer', hint: 'Save listings and searches while you shop the island.' },
  { v: 'agent', label: 'Realtor', hint: 'Publish your own listings. Join an agency later, or right now with an invite code.' },
  { v: 'agency', label: 'Agency', hint: 'Create an agency account, invite your realtors, and list under one brand.' },
];

export function LoginForm({ next, onSwitch, onDone }: InModal & { next: string; onDone: (dest?: string) => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!res.ok) { setError(t(data.error ?? 'Could not sign in')); return; }
    toast(t('Signed in as {name}', { name: data.session.name }));
    onDone();
  }

  return (
    <>
        <h2 className="auth__title">{t('Sign in')}</h2>
        <p className="muted" style={{ margin: '8px 0 20px' }}>{t('Welcome back to Resoha Roatán.')}</p>

        <GoogleButton next={next} />

        <form onSubmit={submit} className="auth__form">
          <div className="field"><label>{t('Email')}</label>
            <input className="input" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></div>
          <div className="field"><label>{t('Password')}</label>
            <input className="input" name="password" type="password" required autoComplete="current-password" placeholder="••••••••" /></div>
          {error && <div className="auth__error">{error}</div>}
          <button className="btn btn--primary btn--lg btn--block" disabled={busy}>{busy ? t('Signing in…') : t('Sign in')}</button>
        </form>

        <p className="small muted" style={{ marginTop: 18, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>{t('No account yet?')} <Switch to="signup" onSwitch={onSwitch}>{t('Create one')} <Icon name="arrowRight" size={15} /></Switch></span>
          <Switch to="forgot" onSwitch={onSwitch}>{t('Forgot password?')}</Switch>
        </p>
    </>
  );
}

export function SignupForm({ initialMode = 'buyer', next, onSwitch, onDone }: InModal & {
  initialMode?: Mode; next: string; onDone: (dest?: string) => void;
}) {
  const t = useT();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  // приманка й час появи форми — сервер відсіює ботів (lib/guard.ts)
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    const res = await fetch('/api/auth/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        email: fd.get('email'), password: fd.get('password'), agencyName: fd.get('agencyName'), inviteCode: fd.get('inviteCode'),
        website: fd.get('website'), ts: shownAt.current,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(t(data.error ?? 'Could not create the account')); return; }
    if (data.pendingConfirmation) { setPending(data.email); return; }
    if (data.warning) toast(data.warning);
    else toast(t(mode === 'agency' ? 'Agency created' : 'Account created'));
    // покупець лишається там, де був; ріелтору одразу потрібен кабінет
    onDone(mode === 'buyer' ? undefined : '/agent');
  }

  const active = MODES.find((m) => m.v === mode)!;

  if (pending) {
    return (
      <div style={{ textAlign: 'center' }}>
          <div className="empty__ico"><Icon name="inbox" size={40} /></div>
          <h2 className="auth__title" style={{ fontSize: 24 }}>{t('Confirm your email')}</h2>
          <p className="muted" style={{ margin: '10px 0 20px' }}>
            {t('Your account is created. Open the confirmation link sent to')} <b>{pending}</b> {t('and then sign in.')}
          </p>
          <p className="tiny muted" style={{ margin: '-8px 0 20px' }}>
            {t('Nothing arrived? This site has no mail service connected yet — ask the Resoha admin to confirm the account by hand.')}
          </p>
          <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => onSwitch('login')}>{t('Go to sign in')}</button>
      </div>
    );
  }

  return (
    <>
        <h2 className="auth__title">{t('Create an account')}</h2>

        <div className="chip-row" style={{ margin: '16px 0 10px' }}>
          {MODES.map((m) => (
            <button key={m.v} type="button" className={`chip-btn ${mode === m.v ? 'is-on' : ''}`}
              onClick={() => setMode(m.v)}>{t(m.label)}</button>
          ))}
        </div>
        <p className="muted small" style={{ marginBottom: 20 }}>{t(active.hint)}</p>

        <GoogleButton next={mode === 'buyer' ? next : '/agent'} as={mode} />
        {mode === 'agency' && (
          <p className="tiny muted" style={{ margin: '-6px 0 14px' }}>
            {t('With Google you get a realtor account first — open the agency from the')} <b>{t('Agency')}</b> {t('tab of your dashboard.')}
          </p>
        )}

        <form onSubmit={submit} className="auth__form">
          <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {mode === 'agency' && (
            <div className="field"><label>{t('Agency name')}</label>
              <input className="input" name="agencyName" required placeholder="Blue Harbour Estates" /></div>
          )}

          <div className="field"><label>{t('Email')}</label>
            <input className="input" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></div>

          <div className="field"><label>{t('Password')}</label>
            <input className="input" name="password" type="password" required minLength={8}
              autoComplete="new-password" placeholder={t('at least 8 characters')} /></div>

          {mode === 'agent' && (
            <div className="field">
              <label>{t('Agency invite code — optional')}</label>
              <input className="input" name="inviteCode" placeholder="ABCD-2345" />
              <span className="tiny muted">
                {t('Have one from an agency? Enter it and your listings go out under their brand. You can also join later from your dashboard, or stay independent.')}
              </span>
            </div>
          )}

          {error && <div className="auth__error">{error}</div>}

          <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
            {busy ? t('Creating…') : mode === 'agency' ? t('Create agency account') : t('Create account')}
          </button>
          <span className="tiny muted">
            {t('By creating an account — with email or Google — you agree to the')}{' '}
            <a className="link-accent" href="/terms" target="_blank" rel="noreferrer">{t('Terms of use')}</a> {t('and')}{' '}
            <a className="link-accent" href="/privacy" target="_blank" rel="noreferrer">{t('Privacy policy')}</a>.
          </span>
        </form>

        <p className="small muted" style={{ marginTop: 18 }}>
          {t('Already registered?')} <Switch to="login" onSwitch={onSwitch}>{t('Sign in')} <Icon name="arrowRight" size={15} /></Switch>
        </p>
    </>
  );
}


export function ForgotForm({ onSwitch }: InModal) {
  const t = useT();
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
    if (!res.ok) { setError(t((await res.json()).error ?? 'Could not send the link')); return; }
    setSent(true);
  }

  return (
    <>
        {sent ? (
          <>
            <div className="empty__ico"><Icon name="inbox" size={40} /></div>
            <h2 className="auth__title" style={{ fontSize: 24 }}>{t('Check your email')}</h2>
            <p className="muted" style={{ margin: '10px 0 20px' }}>
              {t('If that address has an account, a reset link is on its way. The link signs you in once and takes you straight to a new-password form.')}
            </p>
            <p className="tiny muted" style={{ margin: '-8px 0 20px' }}>
              {t('Nothing arrived within a few minutes? This site has no mail service connected yet — ask the Resoha admin to reset it for you.')}
            </p>
            <button type="button" className="btn btn--ghost btn--block" onClick={() => onSwitch('login')}>{t('Back to sign in')}</button>
          </>
        ) : (
          <>
            <h2 className="auth__title">{t('Reset your password')}</h2>
            <p className="muted" style={{ margin: '8px 0 20px' }}>{t("We'll email you a link to set a new one.")}</p>
            <form onSubmit={submit} className="auth__form">
              <div className="field"><label>{t('Email')}</label>
                <input className="input" name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></div>
              {error && <div className="auth__error">{error}</div>}
              <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
                {busy ? t('Sending…') : t('Send reset link')}
              </button>
            </form>
            <p className="small muted" style={{ marginTop: 18 }}>
              <Switch to="login" onSwitch={onSwitch}>{t('Back to sign in')}</Switch>
            </p>
          </>
        )}
    </>
  );
}

export function ResetForm() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get('password') !== fd.get('confirm')) { setError(t('The two passwords do not match')); return; }
    setBusy(true); setError(null);
    const res = await fetch('/api/auth/reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: fd.get('password') }),
    });
    setBusy(false);
    if (!res.ok) { setError(t((await res.json()).error ?? 'Could not update the password')); return; }
    toast(t('Password updated'));
    router.push('/account');
    router.refresh();
  }

  return (
    <div className="auth">
      <div className="auth__card">
        <h1>{t('Set a new password')}</h1>
        <p className="muted" style={{ margin: '8px 0 20px' }}>{t('You are signed in from the email link — pick a new password.')}</p>
        <form onSubmit={submit} className="auth__form">
          <div className="field"><label>{t('New password')}</label>
            <input className="input" name="password" type="password" required minLength={8}
              autoComplete="new-password" placeholder={t('at least 8 characters')} /></div>
          <div className="field"><label>{t('Repeat it')}</label>
            <input className="input" name="confirm" type="password" required minLength={8} autoComplete="new-password" /></div>
          {error && <div className="auth__error">{error}</div>}
          <button className="btn btn--primary btn--lg btn--block" disabled={busy}>
            {busy ? t('Saving…') : t('Save password')}
          </button>
        </form>
      </div>
    </div>
  );
}
