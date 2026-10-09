'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useT } from './LangProvider';

/** Кнопка на сторінці /search-alert: підтвердити підписку гостя або відписатись (0058). */
export default function SearchAlertAction({ token, action }: { token: string; action: 'confirm' | 'stop' }) {
  const t = useT();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'bad'>(token ? 'idle' : 'bad');
  const [query, setQuery] = useState('');

  async function go() {
    setState('busy');
    const res = await fetch('/api/search-alerts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, token }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && typeof d.query === 'string') setQuery(d.query);
    setState(res.ok ? 'done' : 'bad');
  }

  if (state === 'done') {
    return action === 'confirm' ? (
      <>
        <p className="note-ok">{t('Done. We’ll email you when new properties match this search.')}</p>
        <Link className="btn btn--primary btn--lg" style={{ marginTop: 16 }} href={`/listings${query ? `?${query}` : ''}`}>
          {t('See current results')}
        </Link>
      </>
    ) : <p className="note-ok">{t('Done. You won’t get these emails any more.')}</p>;
  }
  if (state === 'bad') {
    return <p className="muted">{t('This link is not valid any more. Save the search again on the listings page.')}</p>;
  }
  return (
    <button className="btn btn--primary btn--lg" onClick={go} disabled={state === 'busy'}>
      {action === 'confirm' ? t('Confirm the alert') : t('Unsubscribe')}
    </button>
  );
}
