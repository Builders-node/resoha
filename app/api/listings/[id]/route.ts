import { NextResponse } from 'next/server';
import { bumpViews, deleteListing, getAgency, getAgent, getListing, updateListing } from '@/lib/db';

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
  const listing = await updateListing(id, patch);
  if (!listing) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ listing });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteListing(id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
