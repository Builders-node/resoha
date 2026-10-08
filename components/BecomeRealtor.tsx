'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Icon from './Icon';
import { useT } from './LangProvider';

/**
 * Залогінений покупець у /agent. Замість «створіть інший акаунт» — перемикаємо роль
 * у цьому ж: обране, пошуки й заявки лишаються. Агенцію відкривають або до неї
 * приєднуються вже з вкладки Agency в кабінеті.
 */
export default function BecomeRealtor({ name }: { name: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<'realtor' | 'agency' | null>(null);
  const [error, setError] = useState('');

  async function upgrade(next: 'realtor' | 'agency') {
    setBusy(next); setError('');
    const r = await fetch('/api/profile/realtor', { method: 'POST' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setError(t(j.error ?? 'Something went wrong. Please try again.')); setBusy(null); return; }
    router.replace(next === 'agency' ? '/agent?tab=team' : '/agent');
    router.refresh();
  }

  return (
    <div className="wrap" style={{ padding: '80px 0' }}>
      <div className="panel" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <div className="empty__ico"><Icon name="building" size={40} /></div>
        <h2 style={{ marginTop: 10 }}>{t('List properties on Resoha')}</h2>

        <p className="muted" style={{ margin: '10px 0 24px' }}>
          {t('You are signed in as')} <b>{name}</b>. {t('Turn this account into a realtor account to publish listings and answer enquiries. Your saved listings and searches stay where they are.')}
        </p>

        <div style={{ display: 'grid', gap: 10 }}>
          <button className="btn btn--primary btn--lg btn--block" disabled={!!busy} onClick={() => upgrade('realtor')}>
            {busy === 'realtor' ? t('Switching…') : t('Become a realtor')}
          </button>
          <button className="link-accent" disabled={!!busy} onClick={() => upgrade('agency')}
            style={{ justifyContent: 'center', marginTop: 4, background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>
            {busy === 'agency' ? t('Switching…') : <>{t('Open or join an agency')} <Icon name="arrowRight" size={15} /></>}
          </button>
          {error && <div className="auth__error">{error}</div>}
          <Link className="btn btn--ghost btn--block" href="/agents">{t('Browse agents & agencies')}</Link>
        </div>
      </div>
    </div>
  );
}
