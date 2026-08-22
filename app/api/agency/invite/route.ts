import { NextResponse } from 'next/server';
import { getAgency } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('rotate_invite_code');
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  const user = await currentUser();
  return NextResponse.json({ inviteCode: data, agency: await getAgency(user?.agencyId ?? null) });
}
