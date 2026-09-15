import { NextResponse } from 'next/server';
import { PAGE_SIZE, createListing, queryPins, searchListings } from '@/lib/db';
import { toListingQuery } from '@/lib/filters';
import { currentUser } from '@/lib/session';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = toListingQuery(searchParams);

  // countOnly — для лічильника у фільтрах; pins — координати всіх збігів для карти
  const mode = searchParams.get('mode');
  if (searchParams.get('countOnly') === '1') {
    const { total } = await searchListings(query, 0, 1);
    return NextResponse.json({ total });
  }
  if (mode === 'pins') return NextResponse.json({ pins: await queryPins(query) });

  const page = Math.max(0, Number(searchParams.get('page') ?? 0) || 0);
  const pageSize = Math.min(60, Number(searchParams.get('pageSize') ?? PAGE_SIZE) || PAGE_SIZE);
  const { items, total, hasMore } = await searchListings(query, page, pageSize);
  return NextResponse.json({ items, total, page, hasMore });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body.title || !body.price) {
    return NextResponse.json({ error: 'Title and price are required' }, { status: 400 });
  }
  try {
    const listing = await createListing({ ...body, agentId: user.id, agencyId: user.agencyId });
    return NextResponse.json({ listing }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
