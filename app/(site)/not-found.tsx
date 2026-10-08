import Link from 'next/link';
import Icon from '@/components/Icon';
import { getT } from '@/lib/i18n/server';

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="wrap" style={{ padding: '92px 0', textAlign: 'center' }}>
      <div className="empty__ico" style={{ display: 'flex', justifyContent: 'center' }}><Icon name="island" size={46} /></div>
      <h1 style={{ marginTop: 12 }}>{t('Page not found')}</h1>
      <p className="muted" style={{ margin: '10px 0 24px' }}>
        {t('This address does not exist any more — a listing may have been sold or taken down, or the link is simply wrong.')}
      </p>
      <Link className="btn btn--primary btn--lg" href="/listings">{t('Browse listings')}</Link>
    </div>
  );
}
