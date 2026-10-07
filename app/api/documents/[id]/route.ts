import { NextResponse } from 'next/server';
import { deleteDocument, updateDocument } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

/** Права задає RLS: документ змінює той, хто керує його ЖК. Позначку «verified» — лише адмін (тригер). */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const patch = await req.json().catch(() => ({}));
  try {
    const document = await updateDocument(id, patch);
    if (!document) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ document });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteDocument(id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
