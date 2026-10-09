import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '@/components/Icon';
import VisitManage from '@/components/VisitManage';
import { getT } from '@/lib/i18n/server';
import { lookupVisit } from '@/lib/visitBookings';

export const metadata: Metadata = { title: 'Your visit', robots: { index: false } };

/** Запис на візит за посиланням із листа: перенести або скасувати без входу в акаунт. */
export default async function VisitTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const visit = await lookupVisit(token);
  if (!visit) {
    const t = await getT();
    return (
      <div className="wrap" style={{ padding: '92px 0', textAlign: 'center', maxWidth: 560 }}>
        <div className="empty__ico" style={{ display: 'flex', justifyContent: 'center' }}><Icon name="calendar" size={46} /></div>
        <h1 style={{ marginTop: 12 }}>{t('Booking not found')}</h1>
        <p className="muted" style={{ margin: '10px 0 24px' }}>{t('The link may be incomplete. Open it again from the email.')}</p>
        <Link className="btn btn--primary" href="/developments">{t('Browse new developments')}</Link>
      </div>
    );
  }
  return (
    <div className="wrap">
      <VisitManage token={token} initial={visit} />
    </div>
  );
}
