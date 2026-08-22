import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Зміна пароля для користувача, що прийшов за посиланням з листа (сесію вже видав /auth/callback). */
export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Reset link expired — request a new one' }, { status: 401 });

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
