import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Обмін коду з листа на сесію: підтвердження пошти та скидання пароля приходять сюди. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL('/login?error=link', url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
