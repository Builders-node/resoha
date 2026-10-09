import { NextResponse } from 'next/server';
import { parseBulk, runBulk } from '@/lib/bulkListings';
import { kickNotifications } from '@/lib/notify';
import { currentUser } from '@/lib/session';

/** Масова дія над вибраними оголошеннями. Права — як у поодиноких: RLS на кожному рядку. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });

  const parsed = parseBulk(await req.json().catch(() => ({})));
  if (typeof parsed === 'string') return NextResponse.json({ error: parsed }, { status: 400 });

  const result = await runBulk(parsed.ids, parsed.op);
  // зниження ціни — тим, хто зберіг оголошення
  if (parsed.op.action === 'price' && result.done) kickNotifications();
  return NextResponse.json(result, { status: result.done ? 200 : 403 });
}
