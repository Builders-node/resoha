import ListingsExplorer from '@/components/ListingsExplorer';
import { getFavorites, queryPins, searchListings } from '@/lib/db';
import { fromParams } from '@/lib/filters';
import { getSession } from '@/lib/session';
import type { Deal, ListingQuery, PropertyType, SortKey } from '@/lib/types';

type SP = Record<string, string | string[] | undefined>;

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = fromParams(sp);
  // Продаж і оренда — різні ринки з різними порядками цін (як розділи «Продаж»/«Оренда» на ЛУН).
  // Без явного вибору показуємо продаж, інакше гістограма цін змішує $1.1K/міс і $1.7M.
  // Виняток — перехід із картки агенції: там показуємо весь її портфель.
  if (!filters.deal && !filters.agentId && !filters.agencyId) filters.deal = 'sale';
  const n = (v: string) => (v ? Number(v) : undefined);

  const query: ListingQuery = {
    deal: (filters.deal as Deal) || undefined,
    type: (filters.type as PropertyType) || undefined,
    neighborhoods: filters.neighborhoods.length ? filters.neighborhoods : undefined,
    beds: filters.beds.length ? filters.beds.map(Number) : undefined,
    bathsMin: n(filters.bathsMin),
    priceMin: n(filters.priceMin),
    priceMax: n(filters.priceMax),
    sqftMin: n(filters.sqftMin),
    sqftMax: n(filters.sqftMax),
    lotMin: n(filters.lotMin),
    lotMax: n(filters.lotMax),
    hoaMax: filters.hoaMax === '' ? undefined : Number(filters.hoaMax),
    yearMin: n(filters.yearMin),
    oceanfront: filters.oceanfront || undefined,
    titled: filters.titled || undefined,
    ownerFinancing: filters.ownerFinancing || undefined,
    tags: filters.tags.length ? filters.tags : undefined,
    agentId: filters.agentId || undefined,
    agencyId: filters.agencyId || undefined,
    q: filters.q || undefined,
    sort: (filters.sort as SortKey) || undefined,
  };

  const [{ items, total, hasMore }, pins] = await Promise.all([searchListings(query), queryPins(query)]);

  const session = await getSession();
  const favIds = session ? await getFavorites(session.id) : [];

  return (
    <ListingsExplorer
      initialItems={items}
      initialPins={pins}
      initialTotal={total}
      initialHasMore={hasMore}
      initialFilters={filters}
      favIds={favIds}
      authed={!!session}
    />
  );
}
