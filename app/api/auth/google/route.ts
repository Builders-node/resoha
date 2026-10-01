import { NextResponse } from 'next/server';
import { safePath } from '@/lib/site';
import { supabaseServer } from '@/lib/supabase/server';

/** Чи ввімкнено Google у проєкті Supabase: інакше людина побачила б сиру помилку GoTrue. */
async function googleEnabled() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return true;   // не знаємо — нехай відповість сам Supabase
    return (await res.json())?.external?.google === true;
  } catch {
    return true;
  }
}

/**
 * Початок входу через Google. Supabase кладе PKCE-верифікатор у кукі цього ж
 * запиту, а назад Google повертає в /auth/callback, де код міняється на сесію.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safePath(url.searchParams.get('next'));
  const as = url.searchParams.get('as');
  const back = (code: string) => NextResponse.redirect(new URL(`/?auth=login&error=${code}`, url.origin));

  if (!(await googleEnabled())) return back('google');

  const callback = new URL('/auth/callback', url.origin);
  callback.searchParams.set('next', next);
  // нові акаунти з вкладок Realtor / Agency мають стати ріелторськими
  if (as === 'agent' || as === 'agency') callback.searchParams.set('as', 'agent');

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) return back('oauth');
  return NextResponse.redirect(data.url);
}
