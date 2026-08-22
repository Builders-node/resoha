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

  const user = await currentUser();
  return NextResponse.json({ session: user ? toSession(user) : null });
}
