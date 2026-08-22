import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Лист із посиланням на зміну пароля. Відповідь однакова для будь-якої пошти — щоб не зливати базу акаунтів. */
export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: 'Enter your email' }, { status: 400 });

  const origin = new URL(req.url).origin;
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset`,
  });

  if (error && /rate limit/i.test(error.message)) {
    return NextResponse.json({
      error: 'Email limit reached on this Supabase project. Connect your own SMTP to send reset links.',
    }, { status: 429 });
  }
  return NextResponse.json({ ok: true });
}
