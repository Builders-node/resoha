import { NextResponse } from 'next/server';
import { agencyMembers, mapAgency, queryListings } from '@/lib/db';
import { currentUserWithAgency } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const { user, agency } = await currentUserWithAgency();
  if (!user || user.role !== 'agent') {
    return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  }
  if (!agency) return NextResponse.json({ agency: null, members: [], inviteCode: null });

  const team = await agencyMembers(agency.id);
  const members = await Promise.all(team.map(async (m) => ({
    ...m,
    listings: (await queryListings({ agentId: m.id, includeInactive: true })).length,
  })));

  return NextResponse.json({
    agency,
    members,
    inviteCode: user.isOwner ? agency.inviteCode : null,
  });
}

/** Приєднатись до агенції за кодом. */
export async function POST(req: Request) {
  const { inviteCode } = await req.json().catch(() => ({}));
  if (!inviteCode) return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('join_agency', { p_code: inviteCode });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ agency: mapAgency(data) });
}
