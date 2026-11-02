import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';
import { agentViewingHours, missingSchema } from '@/lib/visitBookings';
import { cleanSchedule } from '@/lib/visits';

/** Години показів ріелтора для запису на перегляд вторинки (0069). */
export async function GET() {
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  return NextResponse.json(await agentViewingHours(user.id));
}

/** { schedule: 7 днів | [] (типові години), enabled } */
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user || user.role !== 'agent') return NextResponse.json({ error: 'Agent sign-in required' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const schedule = cleanSchedule(b.schedule);
  const { error } = await (await supabaseServer()).from('profiles')
    .update({ viewing_schedule: schedule, viewing_slots: b.enabled !== false }).eq('id', user.id);
  if (error) {
    return NextResponse.json({ error: missingSchema(error) ? 'Viewing hours need the latest database update' : error.message }, { status: 400 });
  }
  return NextResponse.json(await agentViewingHours(user.id));
}
