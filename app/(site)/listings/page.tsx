import ListingsExplorer from '@/components/ListingsExplorer';
import { getFavorites, queryPins, searchListings } from '@/lib/db';
import { fromParams, toListingQuery, toQuery } from '@/lib/filters';
import { getSession } from '@/lib/session';
import { trackPromo } from '@/lib/promo';

type SP = Record<string, string | string[] | undefined>;

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters = fromParams(sp);
  // Продаж і оренда — різні ринки з різними порядками цін (як розділи «Продаж»/«Оренда» на ЛУН).
  // Без явного вибору показуємо продаж, інакше гістограма цін змішує $1.1K/міс і $1.7M.
  // Виняток — перехід із картки агенції: там показуємо весь її портфель.
  if (!filters.deal && !filters.agentId && !filters.agencyId) filters.deal = 'sale';
  // той самий розбір, що й в API: фільтри → рядок запиту → запит до бази
  const query = toListingQuery(new URLSearchParams(toQuery(filters)));

  const [{ items, total, hasMore }, pins, session] = await Promise.all([
    searchListings(query), queryPins(query), getSession(),
  ]);
  const favIds = session ? await getFavorites(session.id) : [];
  await trackPromo('listing', items, 'impression');

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
