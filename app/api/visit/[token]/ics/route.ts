import { buildIcs, seqNow, visitEvent, visitUid } from '@/lib/ics';
import { SITE_URL } from '@/lib/site';
import { lookupVisit } from '@/lib/visitBookings';

type Ctx = { params: Promise<{ token: string }> };

/** Візит за токеном із листа — файлом .ics. Скасований віддаємо як скасований, щоб календар його прибрав. */
export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const visit = await lookupVisit(token);
  if (!visit) return new Response('Booking not found', { status: 404 });
  const dev = visit.development;
  const place = dev?.name || visit.listing.title;
  let ics = buildIcs(visitEvent({
    uid: visitUid(visit.leadId), visitAt: visit.visitAt, place,
    address: dev ? dev.office || [dev.address, dev.neighborhood].filter(Boolean).join(', ') : '',
    manageUrl: `${SITE_URL}/visit/${token}`, agent: visit.agent, sequence: seqNow(),
  }));
  if (visit.status === 'cancelled') ics = ics.replace('STATUS:CONFIRMED', 'STATUS:CANCELLED');
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="visit.ics"',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
