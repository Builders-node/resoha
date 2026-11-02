import { NextResponse } from 'next/server';
import { listMapPlaces, saveMapPlace } from '@/lib/db';
import { cleanPlace } from '@/lib/mapPlaces';
import { currentUser } from '@/lib/session';

/** Усі місця шару, з прихованими. Лише адмін (і RLS так само). */
export async function GET() {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  return NextResponse.json({ places: await listMapPlaces({ all: true }) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const row = cleanPlace(await req.json().catch(() => ({})));
  if (!row) return NextResponse.json({ error: 'Name, type and a point on the map are required' }, { status: 400 });
  try {
    return NextResponse.json({ place: await saveMapPlace(null, row) }, { status: 201 });
  } catch (e) {
    const msg = (e as { message?: string }).message ?? '';
    return NextResponse.json({ error: /map_places/.test(msg) ? 'Map places need the latest database update' : msg }, { status: 400 });
  }
}
