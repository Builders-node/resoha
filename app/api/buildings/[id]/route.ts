import { NextResponse } from 'next/server';
import { deleteBuilding, updateBuilding } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

/** Права задає RLS: дім змінює той, хто керує його ЖК. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const patch = await req.json().catch(() => ({}));
  try {
    const building = await updateBuilding(id, patch);
    if (!building) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ building });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteBuilding(id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
