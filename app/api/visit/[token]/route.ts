import { NextResponse } from 'next/server';
import { withinLimit } from '@/lib/guard';
import { kickNotifications } from '@/lib/notify';
import { lookupVisit, manageVisit } from '@/lib/visitBookings';
import { isOpenSlot } from '@/lib/visits';

type Ctx = { params: Promise<{ token: string }> };

/** Запис на візит за посиланням із листа — без входу, лише за токеном. */
export async function GET(_req: Request, { params }: Ctx) {
  const { token } = await params;
  const visit = await lookupVisit(token);
  if (!visit) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  return NextResponse.json({ visit }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Скасувати ({action:'cancel'}) або перенести ({action:'reschedule', visitAt}). */
export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  if (!(await withinLimit(req, 'visit-manage', 20, 3600))) {
    return NextResponse.json({ error: 'Too many changes. Please try again later.' }, { status: 429 });
  }
  const b = await req.json().catch(() => ({}));
  const visit = await lookupVisit(token);
  if (!visit) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  if (b.action === 'reschedule') {
    const at = new Date(String(b.visitAt ?? ''));
    // слот за графіком ЖК — як і при записі; місткість і свята перевіряє база
    const week = visit.development?.schedule ?? [];
    if (Number.isNaN(at.getTime()) || !week.length || !isOpenSlot(week, at)) {
      return NextResponse.json({ error: 'This time is no longer available. Please pick another one.' }, { status: 400 });
    }
    const r = await manageVisit(token, 'reschedule', at.toISOString());
    if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
    kickNotifications();
    return NextResponse.json({ visit: r.visit });
  }
  if (b.action === 'cancel') {
    const r = await manageVisit(token, 'cancel');
    if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
    kickNotifications();
    return NextResponse.json({ visit: r.visit });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
