import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Серверний клієнт Supabase із сесією користувача з кукі.
 * Усі запити йдуть від його імені — права перевіряє RLS, а не наш код.
 */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(URL, KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Component не може писати кукі — оновленням сесії займається middleware
        }
      },
    },
  });
}
