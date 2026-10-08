'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { toast } from './Toaster';
import { useT } from './LangProvider';
import { UPDATE_TOPICS } from '@/lib/visits';

/**
 * Банер «Найважливіші оновлення ЖК», як у LUN: що прийде в підписці й кнопка «Підписатись».
 * Email підставляємо з акаунта; заявка падає в Leads ріелтора.
 */
export default function DevelopmentUpdates({ devId, devName, email }: { devId: string; devName: string; email: string }) {
  const t = useT();
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  // коли форма зʼявилась: сервер відсіює «відправки» швидші за людину (lib/guard.ts)
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSending(true);
    const res = await fetch(`/api/developments/${devId}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fd.get('email'), website: fd.get('website'), ts: shownAt.current }),
    });
    setSending(false);
    if (res.ok) return setDone(true);
    const error = (await res.json().catch(() => ({}))).error;
    toast(error ? t(error) : t('Something went wrong'));
  }

  return (
    <section className="dupd">
      <span className="dupd__art" aria-hidden="true"><Icon name="bell" size={56} strokeWidth={1.6} /></span>
      <div className="dupd__head">
        <h2 className="dupd__title">{t('Key updates for {name}', { name: devName })}</h2>
        <p className="dupd__sub">{t('The sales office will email you news about this development')}</p>
      </div>
      <ul className="dupd__list">
        {UPDATE_TOPICS.map((x) => <li key={x}><Icon name="check" size={20} strokeWidth={2.2} /> {t(x)}</li>)}
      </ul>
      {done ? (
        <p className="dupd__done"><Icon name="verified" size={22} /> {t('You are subscribed')}</p>
      ) : (
        <form className="dupd__form" onSubmit={submit}>
          <input className="input" name="email" type="email" required maxLength={200} defaultValue={email}
            placeholder="Email" aria-label="Email" />
          {/* приманка для ботів: людина цього поля не бачить і не заповнює */}
          <input className="hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <button className="btn btn--primary btn--lg" disabled={sending}>{sending ? t('Sending…') : t('Subscribe')}</button>
        </form>
      )}
    </section>
  );
}
