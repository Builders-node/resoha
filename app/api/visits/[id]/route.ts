import { NextResponse } from 'next/server';
import { kickNotifications } from '@/lib/notify';
import { currentUser } from '@/lib/session';
import { setVisitStatus } from '@/lib/visitBookings';
import type { VisitStatus } from '@/lib/visits';

type Ctx = { params: Promise<{ id: string }> };

const STATUSES: VisitStatus[] = ['booked', 'cancelled', 'attended', 'no_show'];

/** Відмітка команди: прийшов, не прийшов, скасовано. id — заявка-візит. Права перевіряє visit_set_status. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  const { status } = await req.json().catch(() => ({}));
  if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
  const error = await setVisitStatus(id, status);
  if (error) return NextResponse.json({ error }, { status: /not allowed/i.test(error) ? 403 : 400 });
  if (status === 'cancelled') kickNotifications();
  return NextResponse.json({ ok: true });
}
