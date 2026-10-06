import { NextResponse } from 'next/server';
import { currentUser, toSession } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';

/** Покупець стає ріелтором у тому ж акаунті: обране, пошуки й заявки лишаються. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  if (user.role === 'agent') return NextResponse.json({ session: toSession(user) });

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('become_realtor');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (data?.role !== 'agent') {
    return NextResponse.json({ error: 'Could not switch the account. Please try again.' }, { status: 400 });
  }
  return NextResponse.json({ session: toSession({ ...user, role: 'agent' }) });
}
