'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { useT } from './LangProvider';
import { openAuth } from '@/lib/auth-modal';

/**
 * «Зберегти пошук» для гостя: лише email — і лист-підтвердження (0058).
 * Хто хоче бачити пошуки в акаунті, може замість цього увійти.
 */
export default function GuestSearchAlert({ title, query, onClose }: { title: string; query: string; onClose: () => void }) {
  const t = useT();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const openedAt = useRef(0);
  // onClose батько передає новою функцією щоразу — тримаємо в ref, щоб ефект не перезапускав «час появи»
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    openedAt.current = Date.now();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '').trim();
    setSending(true);
    setError('');
    const res = await fetch('/api/search-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'subscribe', email, title, query, website: fd.get('website'), ts: openedAt.current }),
    });
    setSending(false);
    if (res.ok) return setSent(email);
    const d = await res.json().catch(() => ({}));
    setError(d.error ? t(d.error) : t('Something went wrong'));
  }

  return (
    <div className="modal is-open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__box modal__box--sm" role="dialog" aria-modal="true" aria-labelledby="gsa-title">
        <h3 id="gsa-title" style={{ fontSize: 20 }}>{t('Get new listings by email')}</h3>
        {sent ? (
          <>
            <p className="small note-ok" style={{ marginTop: 12 }}>
              <Icon name="check" size={16} className="ico ico--ok" />{' '}
              {t('Check your inbox: we sent a confirmation link to {email}. Alerts start once you confirm.', { email: sent })}
            </p>
            <button className="btn btn--primary btn--block" style={{ marginTop: 16 }} onClick={onClose}>{t('Close')}</button>
          </>
        ) : (
          <form onSubmit={submit} className="gsa">
            <p className="muted small" style={{ margin: 0 }}>
              {t('We’ll email you when new properties match “{title}”. At most once a day, unsubscribe in one click.', { title })}
            </p>
            <input className="input" name="email" type="email" required maxLength={200} autoComplete="email"
              placeholder={t('Your email')} autoFocus />
            <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            {error && <p className="small gsa__err" role="alert">{error}</p>}
            <button className="btn btn--primary btn--block" disabled={sending}>{sending ? t('Sending…') : t('Get alerts')}</button>
            <p className="tiny muted" style={{ margin: 0, textAlign: 'center' }}>
              {t('Want to keep searches in an account?')}{' '}
              <button type="button" className="gsa__link" onClick={() => { onClose(); openAuth('signup', 'buyer'); }}>
                {t('Sign up')}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
