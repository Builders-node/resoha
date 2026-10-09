import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import BackButton from '@/components/BackButton';
import VisitBooking from '@/components/VisitBooking';
import { developmentContext, loadDevelopment } from '@/lib/developmentPage';
import { SITE_NAME } from '@/lib/site';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ day?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = await loadDevelopment((await params).slug);
  return {
    title: `${d ? `Book a visit to ${d.name}` : 'Book a visit'} | ${SITE_NAME}`,
    // крок форми, а не сторінка для пошуку
    robots: { index: false },
  };
}

/** Окрема сторінка запису на візит у відділ продажів, як /my/appointment у LUN. */
export default async function VisitPage({ params, searchParams }: Props) {
  const ctx = await developmentContext((await params).slug);
  // день із календаря на вкладці «Contacts»
  const { day } = await searchParams;
  const { dev, me, units, base } = ctx;
  // без графіка слотів немає — ведемо на контакти, де є телефон і месенджер
  if (!dev.schedule.length) redirect(`${base}/contacts`);

  const beds = [...new Set(units.map((u) => u.beds))].sort((a, b) => a - b);
  return (
    <div className="wrap">
      <div className="page-top"><BackButton fallback={base} variant="inline" label={dev.name} /></div>
      <VisitBooking devId={dev.id} devName={dev.name}
        address={dev.office || [dev.address, dev.neighborhood].filter(Boolean).join(', ')}
        schedule={dev.schedule} blackout={dev.blackoutDates} note={dev.hours}
        unitTopics={beds.map((b) => (b ? `${b} BR` : 'Studio'))}
        me={me && me.role === 'user' ? { name: me.name, phone: me.phone, email: me.email } : null}
        backHref={base} initialDay={typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined} />
    </div>
  );
}
