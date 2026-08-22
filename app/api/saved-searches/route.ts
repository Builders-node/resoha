import { NextResponse } from 'next/server';
import { countMatches, createSavedSearch, listSavedSearches } from '@/lib/db';
import { parseQuery } from '../listings/route';
import { currentUser } from '@/lib/session';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ items: [] });

  const searches = await listSavedSearches(user.id);
  // до кожного пошуку рахуємо, скільки збігів зараз і скільки зʼявилось після збереження
  const items = await Promise.all(searches.map(async (s) => ({
    ...s,
    ...(await countMatches(parseQuery(new URLSearchParams(s.query)), s.createdAt)),
  })));
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const { title, query } = await req.json().catch(() => ({}));
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
  return NextResponse.json({ item: await createSavedSearch(user.id, title, query ?? '') }, { status: 201 });
}
