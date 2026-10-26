import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { createHandover } from '@/lib/developerHandover';

type Ctx = { params: Promise<{ id: string }> };

/** Нове посилання на передачу профілю компанії; старе невикористане перестає працювати */
export async function POST(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const r = await createHandover((await params).id);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 403 });
  return NextResponse.json(r.handover);
}
