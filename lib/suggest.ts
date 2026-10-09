import { supabaseServer } from './supabase/server';
import { AREAS } from './content/areas';
import { NEIGHBORHOODS } from './format';
import { OPEN_STATUSES } from './units';
import { catalogHref, type SearchTab, type Suggestion } from './searchTabs';
import type { Deal } from './types';

export { isSearchTab } from './searchTabs';

const LIMIT = 8;

/** Без регістру й наголосів: «roatan» знаходить «Roatán». */
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Підказки для пошуку: райони (з довідника й з бази), ЖК і самі оголошення.
 * Порожній запит — найживіші райони вкладки, щоб на телефоні було що вибрати одним дотиком.
 */
export async function suggest(rawQ: string, tab: SearchTab): Promise<Suggestion[]> {
  const q = rawQ.replace(/["\\%*(),]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  const nq = norm(q);
  const db = await supabaseServer();
  const like = `"%${q}%"`;

  // скільки відкритих оголошень у кожному районі — для підпису й щоб не вести в порожнечу
  const countsQuery = async () => {
    if (tab === 'new') return new Map<string, number>();
    let sel = db.from('listings').select('neighborhood').eq('active', true).in('status', OPEN_STATUSES)
      .eq('deal', tab === 'rent' ? 'rent' : 'sale');
    if (tab === 'land') sel = sel.eq('type', 'land');
    const { data } = await sel.limit(2000);
    const m = new Map<string, number>();
    (data ?? []).forEach((r: { neighborhood: string }) => m.set(r.neighborhood, (m.get(r.neighborhood) ?? 0) + 1));
    return m;
  };

  const devsQuery = async () => {
    let sel = db.from('developments').select('slug, name, developer, neighborhood').eq('active', true);
    if (q) sel = sel.or(`name.ilike.${like},developer.ilike.${like},neighborhood.ilike.${like}`);
    else sel = sel.order('featured', { ascending: false }).order('featured_rank', { ascending: true });
    const { data } = await sel.limit(tab === 'new' ? LIMIT : 3);
    return (data ?? []) as { slug: string; name: string; developer: string; neighborhood: string }[];
  };

  const listingsQuery = async () => {
    if (!q || tab === 'new') return [];
    let sel = db.from('listings').select('id, title, neighborhood, price, deal')
      .eq('active', true).in('status', OPEN_STATUSES)
      .eq('deal', tab === 'rent' ? 'rent' : 'sale')
      .or(`title.ilike.${like},address.ilike.${like},neighborhood.ilike.${like}`);
    if (tab === 'land') sel = sel.eq('type', 'land');
    const { data } = await sel.order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(LIMIT);
    return (data ?? []) as { id: string; title: string; neighborhood: string; price: number; deal: Deal }[];
  };

  // одна впала частина не має гасити решту підказок
  const [counts, devs, listings] = await Promise.all([
    countsQuery().catch(() => new Map<string, number>()),
    devsQuery().catch(() => []),
    listingsQuery().catch(() => []),
  ]);

  const areas: Suggestion[] = [];
  if (tab !== 'new') {
    const names = [...new Set([...NEIGHBORHOODS, ...counts.keys()])].filter(Boolean);
    const known = counts.size > 0;
    // окремі райони, потім групи з довідника районів (West End + Gibson Bight тощо)
    names
      .filter((n) => !nq || norm(n).includes(nq))
      .filter((n) => !known || (counts.get(n) ?? 0) > 0)
      .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b))
      .forEach((n) => areas.push({ kind: 'area', label: n, count: counts.get(n) ?? 0, href: catalogHref(tab, { neighborhoods: [n] }) }));
    if (nq) {
      AREAS.filter((a) => a.neighborhoods.length > 1 && norm(a.name).includes(nq)).forEach((a) => {
        const count = a.neighborhoods.reduce((s, n) => s + (counts.get(n) ?? 0), 0);
        if (known && !count) return;
        areas.push({ kind: 'area', label: a.name, count, href: catalogHref(tab, { neighborhoods: a.neighborhoods }) });
      });
    }
  }

  const devItems: Suggestion[] = devs.map((d) => ({
    kind: 'development', label: d.name, sub: [d.developer, d.neighborhood].filter(Boolean).join(' · '), href: `/developments/${d.slug}`,
  }));
  const listingItems: Suggestion[] = listings.map((l) => ({
    kind: 'listing', label: l.title, sub: l.neighborhood, price: Number(l.price), deal: l.deal, href: `/listings/${l.id}`,
  }));

  if (tab === 'new') return devItems.slice(0, LIMIT);
  if (!q) return areas.slice(0, 6);
  // райони першими, але так, щоб лишилось місце для ЖК і оголошень
  const a = areas.slice(0, listingItems.length || devItems.length ? 4 : LIMIT);
  const d = devItems.slice(0, Math.min(2, LIMIT - a.length));
  return [...a, ...d, ...listingItems.slice(0, LIMIT - a.length - d.length)];
}
