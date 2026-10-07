import { NextResponse } from 'next/server';
import { buildAdminAnalytics } from '@/lib/adminAnalytics';
import { adminAnalyticsRaw } from '@/lib/db';
import { currentUser } from '@/lib/session';

/** Аналітика всієї платформи: ?days=7|30|90. Лише для адміна (і RLS так само). */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const d = Number(new URL(req.url).searchParams.get('days'));
  const days = [7, 30, 90].includes(d) ? d : 30;
  return NextResponse.json(buildAdminAnalytics({ days, ...(await adminAnalyticsRaw(days)) }));
}
