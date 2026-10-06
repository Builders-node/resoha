import { NextResponse } from 'next/server';
import { createBuilding, getDevelopment, listBuildings } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { canManageDevelopment } from '@/lib/units';

type Ctx = { params: Promise<{ id: string }> };

/** Доми ЖК — для кабінету */
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  return NextResponse.json({ items: await listBuildings(id) });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  const dev = await getDevelopment(id);
  if (!dev || !canManageDevelopment(dev, user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!String(body.name ?? '').trim()) return NextResponse.json({ error: 'Give the building a name' }, { status: 400 });
  try {
    return NextResponse.json({ building: await createBuilding(dev.id, body) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
