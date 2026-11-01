'use client';
import { useEffect, useState } from 'react';
import Icon from './Icon';
import { useT } from './LangProvider';
import { openAuth } from '@/lib/auth-modal';

/** «Следить за новостями ЖК»: письмо, коли забудовник публікує новину (тригер у міграції 0068). */
export default function DevelopmentFollow({ developmentId }: { developmentId: string }) {
  const t = useT();
  const [s, setS] = useState<{ on: boolean; count: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch(`/api/developments/${developmentId}/follow`).then((r) => r.json()).then((d) => { if (live) setS(d); }).catch(() => {});
    return () => { live = false; };
  }, [developmentId]);

  async function toggle() {
    setBusy(true);
    try {
      const r = await fetch(`/api/developments/${developmentId}/follow`, { method: s?.on ? 'DELETE' : 'POST' });
      if (r.status === 401) { openAuth('signup', 'buyer'); return; }
      if (r.ok) setS(await r.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="dev__follow">
      <button type="button" className={`btn ${s?.on ? 'btn--ghost' : 'btn--primary'}`} onClick={toggle} disabled={busy}>
        <Icon name={s?.on ? 'check' : 'bell'} size={18} /> {s?.on ? t('Following news') : t('Follow news')}
      </button>
      <span className="small muted">
        {s && s.count > 0 ? t(s.count === 1 ? '{n} follower' : '{n} followers', { n: s.count }) : t('Get an email when the developer posts construction news')}
      </span>
    </div>
  );
}
