import { notifySecret } from './notify';
import { supabaseAnon } from './supabase/anon';
import { missingSchema } from './visitBookings';

/**
 * Підписка на пошук без акаунта (міграція 0058): email, лист-підтвердження, відписка за токеном.
 * Усе через функції в базі — гостьових рядків saved_searches RLS не віддає нікому.
 * До міграції функцій немає — тоді кажемо, що підписка поки недоступна.
 */

export type SubscribeResult = 'sent' | 'limited' | 'invalid' | 'unavailable';

export async function subscribeGuest(email: string, title: string, query: string): Promise<SubscribeResult> {
  const secret = notifySecret();
  if (!secret) return 'unavailable';
  const { data, error } = await supabaseAnon().rpc('search_subscribe', {
    p_secret: secret, p_email: email, p_title: title, p_query: query,
  });
  if (error) {
    if (error.code === '22023') return 'invalid';
    if (!missingSchema(error)) console.error('search_subscribe failed:', error.message);
    return 'unavailable';
  }
  return data === 'limited' ? 'limited' : 'sent';
}

/** null — посилання недійсне або прострочене */
export async function confirmGuest(token: string): Promise<{ title: string; query: string } | null> {
  if (!/^[0-9a-f]{32,128}$/i.test(token)) return null;
  const { data, error } = await supabaseAnon().rpc('search_confirm', { p_token: token });
  if (error) {
    if (!missingSchema(error)) console.error('search_confirm failed:', error.message);
    return null;
  }
  const r = data as { title?: string; query?: string } | null;
  return r?.title ? { title: r.title, query: r.query ?? '' } : null;
}

export async function unsubscribeGuest(token: string): Promise<boolean> {
  if (!/^[0-9a-f]{32,128}$/i.test(token)) return false;
  const { data, error } = await supabaseAnon().rpc('search_unsubscribe', { p_token: token });
  if (error) {
    if (!missingSchema(error)) console.error('search_unsubscribe failed:', error.message);
    return false;
  }
  return Boolean(data);
}
