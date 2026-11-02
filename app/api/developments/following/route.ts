import { NextResponse } from 'next/server';
import { listFollowed } from '@/lib/follows';
import { currentUser } from '@/lib/session';

/** ЖК, на оновлення яких підписаний користувач, — вкладка «Developments» у кабінеті. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ items: [] }, { status: 401 });
  try {
    return NextResponse.json({ items: await listFollowed() });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
