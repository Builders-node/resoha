import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { createHandover } from '@/lib/developerHandover';
import { kickNotifications } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

/** Нове посилання на передачу профілю компанії; старе невикористане перестає працювати. З email — шлемо листом */
export async function POST(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const r = await createHandover((await params).id, email || undefined);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 403 });
  if (email) kickNotifications();
  return NextResponse.json(r.handover);
}
