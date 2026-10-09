'use client';
import { useState } from 'react';
import { useT } from './LangProvider';

export default function UnsubscribeButton({ token, what }: { token: string; what: 'leads' | 'alerts' }) {
  const t = useT();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'bad'>(token ? 'idle' : 'bad');

  async function go() {
    setState('busy');
    const res = await fetch('/api/notify/unsubscribe', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, what }),
    });
    setState(res.ok ? 'done' : 'bad');
  }

  if (state === 'done') return <p className="note-ok">{t('Done. You won’t get these emails any more.')}</p>;
  if (state === 'bad') return <p className="muted">{t('This link is not valid any more. Change notifications in your account instead.')}</p>;
  return (
    <button className="btn btn--primary btn--lg" onClick={go} disabled={state === 'busy'}>
      {t('Unsubscribe')}
    </button>
  );
}
