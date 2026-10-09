import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { acceptInvite } from '@/lib/team';

/** Прийняти запрошення з листа: {token}. Потрібен вхід в акаунт ріелтора. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to accept the invitation' }, { status: 401 });
  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== 'string' || !token) return NextResponse.json({ error: 'Invitation not found' }, { status: 400 });
  const r = await acceptInvite(token);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ agency: r.agency });
}
