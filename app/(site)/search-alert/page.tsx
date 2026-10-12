import type { Metadata } from 'next';
import Icon from '@/components/Icon';
import SearchAlertAction from '@/components/SearchAlertAction';
import { getT } from '@/lib/i18n/server';

export const metadata: Metadata = { title: 'Search alert', robots: { index: false } };

/**
 * Підтвердження й відписка гостьової підписки на пошук (0058). Кнопкою, а не самим переходом:
 * поштові сканери відкривають посилання з листів і інакше підтверджували б підписку за людину.
 */
export default async function SearchAlertPage({ searchParams }: { searchParams: Promise<{ t?: string; a?: string }> }) {
  const t = await getT();
  const { t: token = '', a = 'confirm' } = await searchParams;
  const stop = a === 'stop';
  return (
    <div className="wrap" style={{ padding: '92px 0', textAlign: 'center', maxWidth: 560 }}>
      <div className="empty__ico" style={{ display: 'flex', justifyContent: 'center' }}><Icon name="bell" size={46} /></div>
      <h1 style={{ marginTop: 12 }}>{stop ? t('Stop this search alert?') : t('Confirm your search alert')}</h1>
      <p className="muted" style={{ margin: '10px 0 24px' }}>
        {stop
          ? t('You will stop getting emails about new properties for this search.')
          : t('We will email you when new properties match your search: at most once a day, and only when something new appears.')}
      </p>
      <SearchAlertAction token={typeof token === 'string' ? token : ''} action={stop ? 'stop' : 'confirm'} />
    </div>
  );
}
