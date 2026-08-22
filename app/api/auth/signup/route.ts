import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { currentUser, toSession } from '@/lib/session';
import { mapAgency } from '@/lib/db';

type Body = {
  mode?: 'buyer' | 'agent' | 'agency';
  name?: string; email?: string; password?: string; phone?: string;
  agencyName?: string; inviteCode?: string;
};

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Body;
  const mode = b.mode ?? 'buyer';

  if (!b.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!b.email) return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
  if (!b.password || b.password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (mode === 'agency' && !b.agencyName?.trim()) {
    return NextResponse.json({ error: 'Agency name is required' }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data: signUp, error } = await supabase.auth.signUp({
    email: b.email,
    password: b.password,
    options: {
      data: { name: b.name.trim(), role: mode === 'buyer' ? 'user' : 'agent', phone: b.phone ?? '' },
    },
  });
  if (error) {
    const dup = /already registered|already exists/i.test(error.message);
    if (dup) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    // Дефолтний SMTP Supabase має жорсткий ліміт листів — пояснюємо, а не показуємо сире повідомлення
    if (/rate limit/i.test(error.message)) {
      return NextResponse.json({
        error: 'Sign-up email limit reached on this Supabase project. Turn off "Confirm email" in '
             + 'Authentication → Providers → Email, or connect your own SMTP, then try again.',
      }, { status: 429 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Якщо в проєкті увімкнено підтвердження пошти, сесії ще немає: акаунт створено,
  // але зайти можна лише після листа. Агенцію тоді створюємо вже з кабінету.
  if (!signUp.session) {
    return NextResponse.json({
      session: null,
      pendingConfirmation: true,
      email: b.email,
      message: 'Account created. Check your email to confirm it, then sign in.',
    }, { status: 202 });
  }

  // Профіль створює тригер on_auth_user_created; агенцію та вступ робимо RPC-функціями
  let agency = null;
  let warning: string | undefined;

  if (mode === 'agency') {
    const { data, error: e } = await supabase.rpc('create_agency', {
      p_name: b.agencyName, p_phone: b.phone ?? '', p_email: b.email, p_about: '', p_brand: '#16305c',
    });
    if (e) warning = e.message; else agency = mapAgency(data);
  } else if (mode === 'agent' && b.inviteCode?.trim()) {
    const { data, error: e } = await supabase.rpc('join_agency', { p_code: b.inviteCode.trim() });
    if (e) warning = e.message; else agency = mapAgency(data);
  }

  const user = await currentUser();
  return NextResponse.json({ session: user ? toSession(user) : null, agency, warning }, { status: 201 });
}
