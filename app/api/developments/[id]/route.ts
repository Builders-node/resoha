import { NextResponse } from 'next/server';
import { deleteDevelopment, getDevelopment, queryListings, updateDevelopment } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

/** ЖК разом з усіма його квартирами — для сторінки й кабінету */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const development = await getDevelopment(id);
  if (!development) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const units = await queryListings({ developmentId: development.id, includeInactive: true });
  return NextResponse.json({ development, units });
}

/** Права на редагування задає RLS: автор, власник агенції або адмін. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const patch = await req.json().catch(() => ({}));
  try {
    const development = await updateDevelopment(id, patch);
    if (!development) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ development });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Квартири лишаються окремими оголошеннями — посилання на ЖК просто обнуляється */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteDevelopment(id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
