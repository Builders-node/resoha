import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ListingsExplorer from '@/components/ListingsExplorer';
import { PAGE_SIZE, getFavorites, priceStatsRows, queryPins } from '@/lib/db';
import { roomStats, yearAgo } from '@/lib/priceStats';
import { toListingQuery, toQuery } from '@/lib/filters';
import { getSession } from '@/lib/session';
import { headers } from 'next/headers';
import { trackSearchAfterResponse } from '@/lib/track';
import { trackPromo } from '@/lib/promo';
import { getLang } from '@/lib/i18n/server';
import { catalogFilters, catalogMetadata, catalogPage, loadCatalogPage, pageLinks } from '@/lib/catalogSeo';

type SP = Record<string, string | string[] | undefined>;

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  return catalogMetadata(await searchParams, await getLang());
}

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  // Продаж і оренда — різні ринки з різними порядками цін (як розділи «Продаж»/«Оренда» на ЛУН).
  // Без явного вибору показуємо продаж, інакше гістограма цін змішує $1.1K/міс і $1.7M.
  // Виняток — перехід із картки агенції: там показуємо весь її портфель.
  const filters = catalogFilters(sp);
  // ?page=N — окрема сторінка результатів для пошуковиків; «Показати ще» далі дозавантажує
  const page = catalogPage(sp);
  // той самий розбір, що й в API: фільтри → рядок запиту → запит до бази
  const qs = toQuery(filters);
  const query = toListingQuery(new URLSearchParams(qs));

  // статистика цін — по всьому острову для обраного розділу (Buy / Rent), як у ЛУН
  const deal = filters.deal === 'rent' || filters.deal === 'sale' ? filters.deal : null;
  const [{ items, total, hasMore }, pins, session, statRows, lang] = await Promise.all([
    loadCatalogPage(qs, page), queryPins(query), getSession(),
    deal ? priceStatsRows(yearAgo()).catch(() => []) : [],
    getLang(),
  ]);
  // сторінки за межами результатів немає — 404, а не порожній список
  if (page > 1 && !items.length) notFound();
  const favIds = session ? await getFavorites(session.id) : [];
  // відкриття сторінки з фільтрами — теж пошук (далі зміни фільтрів пише /api/listings)
  if (page === 1 && !query.agentId && !query.agencyId) await trackSearchAfterResponse(query, total, await headers());
  await trackPromo('listing', items, 'impression');
  const links = pageLinks(filters, page, total, lang);

  return (
    <>
      {/* React піднімає <link> у <head>: сусідні сторінки для пошуковиків */}
      {links.prev && <link rel="prev" href={links.prev} />}
      {links.next && <link rel="next" href={links.next} />}
      <ListingsExplorer
        initialItems={items}
        initialPins={pins}
        initialTotal={total}
        initialHasMore={hasMore}
        initialFilters={filters}
        initialPage={page - 1}
        pageSize={PAGE_SIZE}
        favIds={favIds}
        authed={!!session}
        roomStats={deal ? roomStats(statRows, deal) : []}
      />
    </>
  );
}
