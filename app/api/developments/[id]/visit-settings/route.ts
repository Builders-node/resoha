import { NextResponse } from 'next/server';
import { getDevelopment } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { saveVisitSettings } from '@/lib/visitBookings';
import { cleanBlackout } from '@/lib/visits';

type Ctx = { params: Promise<{ id: string }> };

/** Місткість слота й свята відділу продажів. Права — RLS developments_update. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const dev = await getDevelopment(id);
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const capacity = Math.min(20, Math.max(1, Math.round(Number(b.capacity) || 1)));
  const blackout = cleanBlackout(b.blackout);
  const error = await saveVisitSettings(dev.id, capacity, blackout);
  if (error) return NextResponse.json({ error }, { status: error === 'Not allowed' ? 403 : 400 });
  return NextResponse.json({ capacity, blackout });
}
