import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { teamVisits } from '@/lib/visitBookings';

/**
 * Календар візитів відділу продажів: ?from=YYYY-MM-DD&to=YYYY-MM-DD (не більше 62 днів).
 * Хто що бачить, вирішує RLS заявок: ріелтор — свої, роль «leads» / менеджер / власник — усю команду.
 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  const url = new URL(req.url);
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  if (!day.test(from) || !day.test(to) || to <= from) return NextResponse.json({ error: 'from and to are required' }, { status: 400 });
  // межі дня беремо з запасом: календар сам розкладає візити за часом офісу
  const start = new Date(Date.parse(`${from}T00:00:00Z`) - 12 * 3600e3);
  const end = new Date(Math.min(Date.parse(`${to}T00:00:00Z`), start.getTime() + 62 * 86400e3) + 12 * 3600e3);
  return NextResponse.json({ items: await teamVisits(start.toISOString(), end.toISOString()) });
}
