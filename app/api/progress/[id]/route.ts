import { NextResponse } from 'next/server';
import { deleteProgress, updateProgress } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

/** Права задає RLS: змінює той, хто керує ЖК. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const patch = await req.json().catch(() => ({}));
  try {
    const entry = await updateProgress(id, patch);
    if (!entry) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteProgress(id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
