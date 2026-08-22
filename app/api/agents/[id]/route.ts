import { NextResponse } from 'next/server';
import { agencyMembers, agentStats, getAgency, getAgent, queryListings } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await getAgent(id);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const wantAgency = new URL(req.url).searchParams.get('scope') === 'agency' && agent.agencyId;
  const scope = wantAgency ? 'agency' : 'own';

  const [agency, team, listings, stats] = await Promise.all([
    getAgency(agent.agencyId),
    agent.agencyId ? agencyMembers(agent.agencyId) : Promise.resolve([]),
    wantAgency
      ? queryListings({ agencyId: agent.agencyId!, includeInactive: true })
      : queryListings({ agentId: id, includeInactive: true }),
    agentStats(id, agent.agencyId, scope),
  ]);

  return NextResponse.json({ agent, agency, team, listings, stats, scope });
}
