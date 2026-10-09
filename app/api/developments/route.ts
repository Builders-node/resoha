import { NextResponse } from 'next/server';
import { createDevelopment, listDevelopments } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { agencyCan } from '@/lib/teamRoles';

/** ?mine=1 — ЖК ріелтора (власнику агенції — усі ЖК агенції), інакше публічний список */
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get('mine') === '1') {
    const user = await currentUser();
    if (!user || user.role !== 'agent') return NextResponse.json({ items: [] });
    const items = await listDevelopments(agencyCan(user, 'listings') && user.agencyId ? { agencyId: user.agencyId } : { agentId: user.id });
    return NextResponse.json({ items });
  }
  return NextResponse.json({ items: await listDevelopments() });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.name || !body.neighborhood) {
    return NextResponse.json({ error: 'Name and area are required' }, { status: 400 });
  }
  try {
    const development = await createDevelopment({ ...body, agentId: user.id });
    return NextResponse.json({ development }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
