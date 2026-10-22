import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Однакові квартири ЖК без номера: забудовник заводить кілька оголошень «Studio for rent»
 * з тією самою ціною, площею й описом (Duna Tower — 16 студій, 6 двокімнатних). Для пошуковика
 * це десятки сторінок з однаковим <title>, які конкурують між собою. Лишаємо одну — з найменшим id,
 * решта постійно перенаправляє на неї (proxy.ts) і не йде в карту сайту. Самі рядки в базі не чіпаємо:
 * щойно квартирі дадуть номер, вона стане окремою сторінкою.
 *
 * Перенаправлення — у proxy, а не на сторінці: сторінка оголошення стрімиться (loading.tsx),
 * і redirect() звідти віддав би 200 з <meta refresh> замість справжнього 308.
 */
const TTL = 10 * 60 * 1000;
let cached: { at: number; map: Map<string, string> } | null = null;

/** копія → головне оголошення групи. Порожня мапа, якщо база не відповіла. */
export async function cloneMap(db: SupabaseClient): Promise<Map<string, string>> {
  if (cached && Date.now() - cached.at < TTL) return cached.map;
  const { data, error } = await db.from('listings').select('id, development_id, deal, type, beds, price, unit_no')
    .eq('active', true).not('development_id', 'is', null)
    .order('id', { ascending: true }).limit(10000);
  if (error) return cached?.map ?? new Map();
  const primary = new Map<string, string>();
  const map = new Map<string, string>();
  for (const r of data ?? []) {
    if (r.unit_no) continue;
    const key = [r.development_id, r.deal, r.type, r.beds, Number(r.price)].join('|');
    const head = primary.get(key);
    if (head) map.set(r.id, head);
    else primary.set(key, r.id);
  }
  cached = { at: Date.now(), map };
  return map;
}
