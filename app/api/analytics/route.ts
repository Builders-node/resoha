import { NextResponse } from 'next/server';
import { buildAnalytics } from '@/lib/analytics';
import { analyticsRaw } from '@/lib/db';
import { currentUser } from '@/lib/session';

/** Вкладка «Analytics» у кабінеті: ?scope=own|agency&days=7|30|90 */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });

  const url = new URL(req.url);
  const days = [7, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 30;
  // усю агенцію бачить лише власник; RLS однаково не віддала б чужого
  const scope = url.searchParams.get('scope') === 'agency' && user.isOwner && user.agencyId ? 'agency' : 'own';

  const raw = await analyticsRaw(user.id, user.agencyId, scope, days);
  return NextResponse.json({ scope, ...buildAnalytics({ days, ...raw }) });
}
