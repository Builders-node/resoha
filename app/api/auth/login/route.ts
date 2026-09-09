import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { currentUser, toSession } from '@/lib/session';

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return NextResponse.json({ error: 'Wrong email or password' }, { status: 401 });

  // currentUser() віддає null і для заблокованого акаунта — тоді куку треба прибрати,
  // інакше людина ходила б із «напівживою» сесією.
  const user = await currentUser();
  if (!user) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'This account is suspended. Contact the platform admin.' }, { status: 403 },
    );
  }
  return NextResponse.json({ session: toSession(user) });
}
