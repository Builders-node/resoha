import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { acceptHandover } from '@/lib/developerHandover';

/** Забрати профіль компанії за посиланням: {token}. Потрібен вхід у будь-який акаунт. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in to take over the profile' }, { status: 401 });
  const { token } = await req.json().catch(() => ({}));
  if (typeof token !== 'string' || !token) return NextResponse.json({ error: 'Link not found' }, { status: 400 });
  const r = await acceptHandover(token);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ developer: r.developer });
}
