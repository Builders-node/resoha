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
  let signup = '';
  const back = (error: string) => NextResponse.redirect(new URL(`/?auth=login&error=${error}`, url.origin));

  // людина натиснула «Скасувати» у Google або провайдер відмовив
  if (url.searchParams.get('error')) return back('oauth');

  if (code) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return back('link');

    // заблокований акаунт не має ходити з живою кукою — так само, як при вході паролем
    const user = await currentUser();
    if (!user) {
      await supabase.auth.signOut();
      return back('suspended');
    }

    // щойно створений через Google акаунт із вкладки Realtor / Agency стає ріелторським
    let becameAgent = false;
    if (url.searchParams.get('as') === 'agent' && user.role === 'user') {
      const { error: e } = await supabase.rpc('become_realtor');
      if (e) console.error('become_realtor failed:', e.message);
      else becameAgent = true;
    }

    // новий акаунт через Google: GA4 sign_up шле браузер (GaSignup) за позначкою в адресі.
    // «Новий» — створений щойно; давній акаунт, що вперше зайшов через Google, сюди не потрапить
    const u = data.user;
    const created = u?.created_at ? Date.parse(u.created_at) : 0;
    if (u?.app_metadata?.provider === 'google' && Date.now() - created < 2 * 60_000) {
      signup = becameAgent ? 'google_agent' : 'google';
    }
  }
  const dest = new URL(next, url.origin);
  if (signup) dest.searchParams.set('ga_signup', signup);
  return NextResponse.redirect(dest);
}
