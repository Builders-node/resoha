import type { Metadata } from 'next';
import Icon from '@/components/Icon';
import UnsubscribeButton from '@/components/UnsubscribeButton';
import { getT } from '@/lib/i18n/server';

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false } };

/** Відписка за посиланням із листа. Кнопкою, а не самим переходом: поштові сканери відкривають посилання. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; what?: string }> }) {
  const t = await getT();
  const { t: token = '', what = 'alerts' } = await searchParams;
  const leads = what === 'leads';
  return (
    <div className="wrap" style={{ padding: '92px 0', textAlign: 'center', maxWidth: 560 }}>
      <div className="empty__ico" style={{ display: 'flex', justifyContent: 'center' }}><Icon name="bell" size={46} /></div>
      <h1 style={{ marginTop: 12 }}>{t('Email notifications')}</h1>
      <p className="muted" style={{ margin: '10px 0 24px' }}>
        {leads
          ? t('Stop emails about enquiries, visits and your listings? You can turn them back on in your dashboard.')
          : t('Stop emails about saved searches and price drops? You can turn them back on in your account.')}
      </p>
      <UnsubscribeButton token={token} what={leads ? 'leads' : 'alerts'} />
    </div>
  );
}
