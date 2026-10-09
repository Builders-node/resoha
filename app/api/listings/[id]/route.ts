import { NextResponse } from 'next/server';
import { bumpViews, deleteListing, getAgency, getAgent, getBuilding, getDevelopment, getListing, saveLandFacts, updateListing } from '@/lib/db';
import { kickNotifications } from '@/lib/notify';
import { currentUser } from '@/lib/session';
import { canManageDevelopment } from '@/lib/units';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (new URL(req.url).searchParams.get('view') === '1') await bumpViews(id);

  return NextResponse.json({
    listing,
    agent: await getAgent(listing.agentId),
    agency: await getAgency(listing.agencyId),
  });
}

/** Права на редагування задає RLS: автор або власник агенції. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const patch = await req.json().catch(() => ({}));
  // квартиру можна перенести лише у свій ЖК (або ЖК своєї агенції)
  if (patch.developmentId) {
    const [user, dev] = await Promise.all([currentUser(), getDevelopment(String(patch.developmentId))]);
    if (!user || !dev || !canManageDevelopment(dev, user)) return NextResponse.json({ error: 'Not your development' }, { status: 403 });
  }
  // дім — лише з ЖК цієї квартири
  if (patch.buildingId) {
    const [b, current] = await Promise.all([getBuilding(String(patch.buildingId)), getListing(id)]);
    const devId = patch.developmentId ?? current?.developmentId;
    if (!b || b.developmentId !== devId) return NextResponse.json({ error: 'Building is not in this development' }, { status: 400 });
  }
  let listing = await updateListing(id, patch);
  if (!listing) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // паспорт ділянки — окрема таблиця; зберігаємо лише для землі
  if (listing.type === 'land' && patch.land && typeof patch.land === 'object') {
    await saveLandFacts(id, patch.land);
    listing = (await getListing(id)) ?? listing;
  }
  // зниження ціни (тим, хто зберіг) і «на перевірку» (модератору) — у черзі сповіщень
  if (patch.price !== undefined || patch.review !== undefined) kickNotifications();
  return NextResponse.json({ listing });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteListing(id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
