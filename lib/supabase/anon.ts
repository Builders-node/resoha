import { createClient } from '@supabase/supabase-js';

/**
 * Клієнт без кукі й без сесії — для фонової роботи (черга сповіщень, cron), де користувача немає.
 * Права ті самі, що в гостя: RLS бачить лише публічне, решту відкривають функції із секретом.
 */
export function supabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
