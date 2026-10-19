import { cache } from 'react';
import { supabaseServer } from './supabase/server';
import type { Listing } from './types';

/**
 * Однакові квартири ЖК без номера: забудовник заводить кілька оголошень «Studio for rent»
 * з тією самою ціною, площею й описом (Duna Tower — 16 студій, 6 двокімнатних). Для пошуковика
 * це десятки сторінок з однаковим <title>, які конкурують між собою. Лишаємо одну — з найменшим id,
 * решта постійно перенаправляє на неї й не йде в карту сайту. Самі рядки в базі не чіпаємо:
 * щойно квартирі дадуть номер, вона стане окремою сторінкою.
 */
type Key = Pick<Listing, 'id' | 'developmentId' | 'unitNo' | 'deal' | 'type' | 'beds' | 'price'>;

const NO_UNIT = 'unit_no.is.null,unit_no.eq.';

const groupKey = (r: { development_id: string; deal: string; type: string; beds: number; price: number | string }) =>
  [r.development_id, r.deal, r.type, r.beds, Number(r.price)].join('|');

/** id головного оголошення групи, якщо це — копія; null, якщо оголошення саме собі головне. */
export const clonePrimary = cache(async (l: Key): Promise<string | null> => {
  if (!l.developmentId || l.unitNo) return null;
  const db = await supabaseServer();
  const { data, error } = await db.from('listings').select('id')
    .eq('active', true).eq('development_id', l.developmentId).eq('deal', l.deal).eq('type', l.type)
    .eq('beds', l.beds).eq('price', l.price).or(NO_UNIT)
    .order('id', { ascending: true }).limit(1);
  if (error || !data?.length) return null;
  return data[0].id === l.id ? null : data[0].id;
});

/** id усіх копій (без головних) — щоб не давати їх у карту сайту. */
export async function cloneIds(): Promise<Set<string>> {
  const db = await supabaseServer();
  const { data, error } = await db.from('listings').select('id, development_id, deal, type, beds, price')
    .eq('active', true).not('development_id', 'is', null).or(NO_UNIT)
    .order('id', { ascending: true }).limit(5000);
  if (error) return new Set();
  const seen = new Set<string>();
  const out = new Set<string>();
  for (const r of data ?? []) {
    const k = groupKey(r);
    if (seen.has(k)) out.add(r.id);
    else seen.add(k);
  }
  return out;
}
