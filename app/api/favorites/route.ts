import { NextResponse } from 'next/server';
import { getFavorites, queryListings, toggleFavorite } from '@/lib/db';
import { currentUser } from '@/lib/session';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ids: [], items: [] });
  const ids = await getFavorites(user.id);
  const items = ids.length ? await queryListings({ ids }) : [];
  return NextResponse.json({ ids, items });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const { listingId } = await req.json().catch(() => ({}));
  if (!listingId) return NextResponse.json({ error: 'listingId is required' }, { status: 400 });
  const on = await toggleFavorite(user.id, listingId);
  return NextResponse.json({ on, ids: await getFavorites(user.id) });
}
