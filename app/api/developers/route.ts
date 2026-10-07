import { NextResponse } from 'next/server';
import { createDeveloper, listDevelopers } from '@/lib/db';
import { currentUser } from '@/lib/session';

/** ?mine=1 — профілі забудовника, які веде цей акаунт; інакше всі (для вибору в формі ЖК) */
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('mine') === '1') {
    const user = await currentUser();
    if (!user) return NextResponse.json({ items: [] });
    return NextResponse.json({ items: await listDevelopers({ ownerId: user.id }) });
  }
  return NextResponse.json({ items: await listDevelopers() });
}

/** Будь-який залогінений акаунт: забудовник заводить себе сам, ріелтор — коли додає ЖК */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!String(body.name ?? '').trim()) return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  try {
    const developer = await createDeveloper({ ...body, ownerId: user.id });
    return NextResponse.json({ developer }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
