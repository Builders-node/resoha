'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { useT } from './LangProvider';
import { openAuth } from '@/lib/auth-modal';
import type { FollowState } from '@/lib/follows';
import { UPDATE_TOPICS } from '@/lib/visits';

/**
 * Банер «Key updates for <ЖК>» внизу кожної вкладки ЖК: що прийде в підписці й одна велика кнопка.
 * Із акаунтом — підписка в один клік (development_follows, міграція 0068) і список у кабінеті;
 * гість лишає email. Обидва варіанти ще й падають заявкою в Leads ріелтора (/subscribe).
 */
export default function DevelopmentUpdates({ devId, devName, email, signedIn, initial }: {
  devId: string;
  devName: string;
  /** email з акаунта; порожній у гостя */
  email: string;
  signedIn: boolean;
  initial: FollowState;
}) {
  const t = useT();
  const [on, setOn] = useState(initial.on);
  const [count, setCount] = useState(initial.count);
  const [busy, setBusy] = useState(false);
  // гість підписався email-ом: показуємо «готово» і пропонуємо акаунт
  const [guestDone, setGuestDone] = useState(false);
  // коли форма зʼявилась: сервер відсіює «відправки» швидші за людину (lib/guard.ts)
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);

  async function subscribe(mail: string, website = '') {
    setBusy(true);
    try {
      const res = await fetch(`/api/developments/${devId}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, website, ts: shownAt.current }),
      });
      if (!res.ok) {
        const error = (await res.json().catch(() => ({}))).error;
        toast(error ? t(error) : t('Something went wrong'));
        return;
      }
      if (signedIn) { setOn(true); setCount((n) => n + 1); } else setGuestDone(true);
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const res = await fetch(`/api/developments/${devId}/follow`, { method: 'DELETE' });
      if (res.ok) {
        const s: FollowState = await res.json();
        setOn(s.on); setCount(s.count);
        toast(t('You will no longer get updates for {name}', { name: devName }));
      } else toast(t('Something went wrong'));
    } finally {
      setBusy(false);
    }
  }

  function submitGuest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    subscribe(String(fd.get('email') ?? ''), String(fd.get('website') ?? ''));
  }

  const subscribed = on || guestDone;
  const sub = on
    ? t('Updates are saved in your Hogarli account and sent to {email}', { email })
    : guestDone
      ? t('We will email you when there is news. Create an account to keep every update in one place.')
      : signedIn
        ? t('Updates are saved in your Hogarli account and sent to {email}', { email })
        : t('We will email you the news. With a Hogarli account, every update is also saved in your profile.');

  return (
    <section className={`dupd${subscribed ? ' is-on' : ''}`} aria-labelledby="dupd-title">
      <span className="dupd__art" aria-hidden="true">
        <Icon name="bell" size={52} strokeWidth={1.6} />
        <i className="dupd__dot" />
      </span>
      <div className="dupd__head">
        <h2 className="dupd__title" id="dupd-title">{t('Key updates for {name}', { name: devName })}</h2>
        <p className="dupd__sub">{sub}</p>
      </div>
      <ul className="dupd__list">
        {UPDATE_TOPICS.map((x) => <li key={x}><Icon name="check" size={20} strokeWidth={2.2} /> {t(x)}</li>)}
      </ul>

      <div className="dupd__cta">
        {on ? (
          <>
            <p className="dupd__done"><Icon name="verified" size={22} /> {t('You are subscribed')}</p>
            <div className="dupd__links small">
              <Link href="/account?tab=developments" className="link-accent">{t('My subscriptions')}</Link>
              <button type="button" className="dupd__off" onClick={unsubscribe} disabled={busy}>{t('Unsubscribe')}</button>
            </div>
          </>
        ) : guestDone ? (
          <>
            <p className="dupd__done"><Icon name="verified" size={22} /> {t('You are subscribed')}</p>
            <button type="button" className="btn btn--ghost" onClick={() => openAuth('signup', 'buyer')}>{t('Create an account')}</button>
          </>
        ) : signedIn ? (
          <button type="button" className="btn btn--primary btn--lg dupd__btn" onClick={() => subscribe(email)} disabled={busy}>
            {busy ? t('Sending…') : t('Subscribe')}
          </button>
        ) : (
          <form className="dupd__form" onSubmit={submitGuest}>
            <input className="input" name="email" type="email" required maxLength={200}
              placeholder="Email" aria-label="Email" autoComplete="email" />
            {/* приманка для ботів: людина цього поля не бачить і не заповнює */}
            <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <button className="btn btn--primary btn--lg dupd__btn" disabled={busy}>{busy ? t('Sending…') : t('Subscribe')}</button>
            <button type="button" className="dupd__off small" onClick={() => openAuth('login')}>{t('Or sign in to subscribe in one click')}</button>
          </form>
        )}
        {count > 1 && <span className="tiny muted">{t('{n} followers', { n: count })}</span>}
      </div>
    </section>
  );
}
