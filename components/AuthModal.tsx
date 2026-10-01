'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ForgotForm, LoginForm, SignupForm } from './AuthForms';
import Icon from './Icon';
import { AUTH_EVENT, isAuthMode, isAuthView, type AuthMode, type AuthRequest, type AuthView } from '@/lib/auth-modal';

/** Пояснення до ?error=… — сюди повертають /auth/callback і /api/auth/google. */
const NOTICES: Record<string, string> = {
  link: 'That link has expired or was already used. Sign in, or ask for a new one.',
  google: 'Google sign-in is not switched on for this site yet. Use your email and password for now.',
  oauth: 'Google sign-in did not go through. Please try again.',
  suspended: 'This account is suspended. Contact the platform admin.',
};

export default function AuthModal() {
  const [view, setView] = useState<AuthView | null>(null);
  const [mode, setMode] = useState<AuthMode>('buyer');
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // 1. Кнопки на сторінці
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<AuthRequest>).detail;
      setNotice(null);
      if (d.as) setMode(d.as);
      setView(d.view);
    };
    window.addEventListener(AUTH_EVENT, onOpen);
    return () => window.removeEventListener(AUTH_EVENT, onOpen);
  }, []);

  // 2. Адреса: /login, /signup і /forgot переводять на ?auth=…, сюди ж повертає Google
  const fromUrl = sp.get('auth');
  const asFromUrl = sp.get('as');
  const errFromUrl = sp.get('error');
  useEffect(() => {
    if (!isAuthView(fromUrl)) return;
    if (isAuthMode(asFromUrl)) setMode(asFromUrl);
    setNotice(errFromUrl ? NOTICES[errFromUrl] ?? null : null);
    setView(fromUrl);
  }, [fromUrl, asFromUrl, errFromUrl]);

  /** Прибираємо службові параметри, щоб оновлення сторінки не відкривало модалку знову. */
  const cleanUrl = useCallback(() => {
    if (!sp.get('auth')) return;
    const rest = new URLSearchParams(sp.toString());
    ['auth', 'as', 'error'].forEach((k) => rest.delete(k));
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [sp, pathname, router]);

  const close = useCallback(() => { setView(null); cleanUrl(); }, [cleanUrl]);

  /** Після входу лишаємось на тій самій сторінці; dest — лише коли новому акаунту потрібен кабінет. */
  const done = useCallback((dest?: string) => {
    setView(null);
    if (dest) router.push(dest); else cleanUrl();
    router.refresh();
  }, [router, cleanUrl]);

  useEffect(() => {
    if (!view) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = prev; };
  }, [view, close]);

  if (!view) return null;

  // куди повернутись після Google: туди, де людина відкрила модалку
  const rest = new URLSearchParams(sp.toString());
  ['auth', 'as', 'error'].forEach((k) => rest.delete(k));
  const here = rest.size ? `${pathname}?${rest}` : pathname;

  const switchTo = (v: AuthView) => { setNotice(null); setView(v); };

  return (
    <div className="modal is-open" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className={`modal__box modal__box--auth ${view === 'signup' ? 'is-wide' : ''}`} role="dialog" aria-modal="true">
        <button className="modal__x" aria-label="Close" onClick={close}><Icon name="close" size={20} /></button>
        {notice && <div className="auth__error" style={{ marginBottom: 16 }}>{notice}</div>}
        {view === 'login' && <LoginForm next={here} onSwitch={switchTo} onDone={done} />}
        {view === 'signup' && <SignupForm key={mode} initialMode={mode} next={here} onSwitch={switchTo} onDone={done} />}
        {view === 'forgot' && <ForgotForm onSwitch={switchTo} />}
      </div>
    </div>
  );
}
