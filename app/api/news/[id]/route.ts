import { NextResponse } from 'next/server';
import { deleteNews, updateNews } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

/** Права задає RLS: змінює той, хто керує ЖК. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const patch = await req.json().catch(() => ({}));
  try {
    const item = await updateNews(id, patch);
    if (!item) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteNews(id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
