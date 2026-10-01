import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { safePath } from '@/lib/site';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Обмін коду на сесію. Сюди приходять підтвердження пошти, скидання пароля
 * і повернення з Google.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = safePath(url.searchParams.get('next'));
  const back = (error: string) => NextResponse.redirect(new URL(`/?auth=login&error=${error}`, url.origin));

  // людина натиснула «Скасувати» у Google або провайдер відмовив
  if (url.searchParams.get('error')) return back('oauth');

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return back('link');

    // заблокований акаунт не має ходити з живою кукою — так само, як при вході паролем
    const user = await currentUser();
    if (!user) {
      await supabase.auth.signOut();
      return back('suspended');
    }

    // щойно створений через Google акаунт із вкладки Realtor / Agency стає ріелторським
    if (url.searchParams.get('as') === 'agent' && user.role === 'user') {
      const { error: e } = await supabase.rpc('become_realtor');
      if (e) console.error('become_realtor failed:', e.message);
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
