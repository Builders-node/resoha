import { NextResponse } from 'next/server';
import { createNews, getDevelopment, listNews } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { canManageDevelopment } from '@/lib/units';

type Ctx = { params: Promise<{ id: string }> };

/** Новини ЖК — для кабінету */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return NextResponse.json({ items: await listNews(id) });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  const dev = await getDevelopment(id);
  if (!dev || !canManageDevelopment(dev, user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!String(body.title ?? '').trim()) return NextResponse.json({ error: 'Give the news a title' }, { status: 400 });
  try {
    return NextResponse.json({ item: await createNews(dev.id, body) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
