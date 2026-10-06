import { NextResponse } from 'next/server';
import { PAGE_SIZE, adminLog, createListing, getBuilding, getDevelopment, getListing, queryPins, saveLandFacts, searchListings } from '@/lib/db';
import { canManageDevelopment } from '@/lib/units';
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
  const body = await req.json().catch(() => ({}));

  // Адмін заводить оголошення на ріелтора (наприклад, на «listings desk»);
  // агенцію за ріелтором підставляє тригер listings_guard.
  const onBehalf = user?.isAdmin && typeof body.agentId === 'string' && body.agentId ? body.agentId : null;
  if (!user || (!onBehalf && user.role !== 'agent')) {
    return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  }
  if (!body.title || !body.price) {
    return NextResponse.json({ error: 'Title and price are required' }, { status: 400 });
  }
  // квартиру можна покласти лише у свій ЖК (або ЖК своєї агенції)
  if (body.developmentId) {
    const dev = await getDevelopment(String(body.developmentId));
    if (!dev || !canManageDevelopment(dev, user)) return NextResponse.json({ error: 'Not your development' }, { status: 403 });
  }
  // дім — лише з того самого ЖК
  if (body.buildingId) {
    const b = await getBuilding(String(body.buildingId));
    if (!b || b.developmentId !== body.developmentId) return NextResponse.json({ error: 'Building is not in this development' }, { status: 400 });
  }
  try {
    let listing = await createListing({
      ...body, agentId: onBehalf ?? user.id, agencyId: onBehalf ? null : user.agencyId,
    });
    if (listing.type === 'land' && body.land && typeof body.land === 'object') {
      await saveLandFacts(listing.id, body.land);
      listing = (await getListing(listing.id)) ?? listing;
    }
    if (onBehalf) {
      await adminLog({ id: user.id, name: user.name }, {
        action: 'listing.create', targetKind: 'listing', targetId: listing.id, targetName: listing.title,
      });
    }
    return NextResponse.json({ listing }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
