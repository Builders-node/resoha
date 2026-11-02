import { NextResponse } from 'next/server';
import { saveMapPlace } from '@/lib/db';
import { cleanPlace } from '@/lib/mapPlaces';
import { currentUser } from '@/lib/session';

type Ctx = { params: Promise<{ id: string }> };

/** Правка місця або { active: false } — сховати (видалення немає). */
export async function PATCH(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const row = Object.keys(b).length === 1 && 'active' in b ? { active: Boolean(b.active) } : cleanPlace(b);
  if (!row) return NextResponse.json({ error: 'Name, type and a point on the map are required' }, { status: 400 });
  try {
    const place = await saveMapPlace(id, row);
    if (!place) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ place });
  } catch (e) {
    return NextResponse.json({ error: (e as { message?: string }).message ?? 'Could not save' }, { status: 400 });
  }
}
