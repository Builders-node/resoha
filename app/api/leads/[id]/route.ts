import { NextResponse } from 'next/server';
import { LeadError, parseLeadPatch, updateLead } from '@/lib/leadsCrm';
import { currentUser } from '@/lib/session';

/**
 * Стадія воронки, причина програшу або відповідальний ріелтор (міграція 0053).
 * Доступ — політика leads_update; перепризначення — лише власник агенції.
 * Старий формат { status: 'new' | 'done' } теж приймаємо.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  try {
    await updateLead(id, parseLeadPatch(await req.json().catch(() => ({}))));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof LeadError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
