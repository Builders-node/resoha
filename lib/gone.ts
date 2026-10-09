import { cache } from 'react';
import { queryListings } from './db';
import { supabaseServer } from './supabase/server';
import type { Deal, Listing, PropertyType } from './types';

/** Що можна сказати про знятий з показу обʼєкт (функція listing_gone, міграція 0057) */
export type GoneListing = {
  title: string; neighborhood: string; island: string;
  type: PropertyType; deal: Deal; price: number; sold: boolean;
};

/**
 * null — такого id ніколи не публікували (або міграції 0057 ще немає): тоді чесний 404.
 * Помилки PostgREST (немає функції, кривий uuid) теж ведуть у 404.
 */
export const getGoneListing = cache(async (id: string): Promise<GoneListing | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const { data, error } = await (await supabaseServer()).rpc('listing_gone', { p_id: id });
    const row = !error && Array.isArray(data) ? data[0] : null;
    if (!row) return null;
    return {
      title: String(row.title ?? ''), neighborhood: String(row.neighborhood ?? ''), island: String(row.island ?? ''),
      type: row.type as PropertyType, deal: row.deal as Deal, price: Number(row.price) || 0, sold: Boolean(row.sold),
    };
  } catch {
    return null;
  }
});

/** Схожі живі обʼєкти: спершу той самий тип у тому ж районі, потім будь-який тип там, потім тип по всьому острову */
export async function similarActive(g: { deal: Deal; type: PropertyType; neighborhood: string; price: number }, skipId: string, n = 8) {
  const safe = (p: Promise<Listing[]>) => p.catch(() => [] as Listing[]);
  const [sameType, sameArea, island] = await Promise.all([
    safe(queryListings({ deal: g.deal, type: g.type, neighborhoods: [g.neighborhood] })),
    safe(queryListings({ deal: g.deal, neighborhoods: [g.neighborhood] })),
    safe(queryListings({ deal: g.deal, type: g.type })),
  ]);
  // ближчі за ціною — вище
  const byPrice = (a: Listing, b: Listing) => Math.abs(a.price - g.price) - Math.abs(b.price - g.price);
  const seen = new Set([skipId]);
  const out: Listing[] = [];
  for (const list of [sameType, sameArea, island]) {
    for (const l of [...list].sort(byPrice)) {
      if (out.length >= n) return out;
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      out.push(l);
    }
  }
  return out;
}
