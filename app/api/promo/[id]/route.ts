import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { cancelCampaign } from '@/lib/promo';

/** Скасувати свою неоплачену заявку (оплачену скасовує лише адмін — це повернення грошей). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const { id } = await params;
  try {
    await cancelCampaign(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }
}
