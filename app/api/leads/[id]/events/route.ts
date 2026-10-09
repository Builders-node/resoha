import { NextResponse } from 'next/server';
import { LeadError, addLeadNote, leadEvents } from '@/lib/leadsCrm';
import { currentUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

/** Історія заявки: зміни стадії, перепризначення, нотатки. Хто бачить — вирішує RLS lead_events. */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  try {
    return NextResponse.json(await leadEvents(id));
  } catch (e) {
    if (e instanceof LeadError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

/** Нотатка до заявки — від імені поточного ріелтора */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  const { body } = await req.json().catch(() => ({}));
  try {
    await addLeadNote(id, user.id, String(body ?? ''));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    if (e instanceof LeadError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
