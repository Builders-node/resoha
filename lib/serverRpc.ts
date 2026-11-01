import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Лічильники (перегляди, покази, пошуки, ліміти) — через *_s-версії із секретом сервера (міграція 0066):
 * напряму з браузера їх більше не накрутиш. Без секрету чи до міграції — стара функція, як було.
 */
export async function serverRpc(client: SupabaseClient, name: string, args: Record<string, unknown>) {
  const secret = process.env.PROMO_SECRET;
  if (secret) {
    const res = await client.rpc(`${name}_s`, { p_secret: secret, ...args });
    if (!res.error) return res;
    // функції ще немає або секрет не збігся з базою — далі старим шляхом, щоб нічого не зламати
    if (!/_s|Not allowed|PGRST202|42501/.test(`${res.error.code} ${res.error.message}`)) return res;
  }
  return client.rpc(name, args);
}
