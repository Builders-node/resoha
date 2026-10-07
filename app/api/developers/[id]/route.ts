import { NextResponse } from 'next/server';
import { deleteDeveloper, getDeveloper, updateDeveloper } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const developer = await getDeveloper((await params).id);
  if (!developer) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ developer });
}

/** Права задає RLS: власник профілю або адмін */
export async function PATCH(req: Request, { params }: Ctx) {
  const patch = await req.json().catch(() => ({}));
  try {
    const developer = await updateDeveloper((await params).id, patch);
    if (!developer) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ developer });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** ЖК лишаються, у них просто зникає посилання на профіль (назва текстом зберігається) */
export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = await deleteDeveloper((await params).id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
