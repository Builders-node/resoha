import { NextResponse } from 'next/server';
import { myTeams } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';

/** Усі команди, у яких складається користувач, з позначкою активної. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  return NextResponse.json({ teams: await myTeams(user) });
}

/** Перемкнути активну команду: нові оголошення й ЖК підуть у неї. */
export async function PUT(req: Request) {
  const { agencyId } = await req.json().catch(() => ({}));
  if (!agencyId) return NextResponse.json({ error: 'agencyId is required' }, { status: 400 });

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('switch_agency', { p_agency: agencyId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
