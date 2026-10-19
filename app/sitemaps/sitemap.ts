import type { MetadataRoute } from 'next';
import { agencyBoard, listAgents, listDevelopers } from '@/lib/db';
import { AREAS } from '@/lib/content/areas';
import { GUIDES } from '@/lib/content/guides';
import { POSTS, TOPICS } from '@/lib/content/blog';
import { MARKET_UPDATED } from '@/lib/content/market';
import { SITE_URL } from '@/lib/site';
import { fromParams, toQuery } from '@/lib/filters';
import { catalogUrl, loadCatalogPage } from '@/lib/catalogSeo';
import { cloneMap } from '@/lib/clones';
import { supabaseAnon } from '@/lib/supabase/anon';
import { both, sitemapDevelopments, sitemapIds, sitemapListings } from '@/lib/sitemapData';

/**
 * Карта сайту кількома файлами (/sitemaps/sitemap/<id>.xml), список файлів — у /sitemap.xml.
 * Кожна публічна сторінка йде двічі: англійською й /es, з hreflang між ними;
 * оголошення й ЖК — ще й з фото (image sitemap).
 */
export async function generateSitemaps() {
  return (await sitemapIds()).map((id) => ({ id }));
}

/**
 * Каталог з фільтрами в карті сайту — лише розділ і розділ × тип (продаж/оренда × кондо/будинок/земля).
 * Міста, райони, спальні й «біля моря» лишаються індексованими сторінками, якщо не тонкі,
 * але в карту не йдуть: їх знаходять за посиланнями з оголошень і сторінок районів.
 */
const CATALOG = [
  'deal=sale', 'deal=rent',
  'deal=sale&type=condo', 'deal=sale&type=house', 'deal=sale&type=land',
  'deal=rent&type=condo', 'deal=rent&type=house', 'deal=rent&type=land',
].map((q) => catalogUrl(fromParams(new URLSearchParams(q))));

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const key = String(await id);

  if (key === 'pages') {
    // порожня добірка (скажімо, земля в оренду) має noindex — у карту не йде
    const catalog = (await Promise.all(CATALOG.map(async (u) => {
      const f = fromParams(new URLSearchParams(u.split('?')[1] ?? ''));
      const { total } = await loadCatalogPage(toQuery(f), 1).catch(() => ({ total: 1 }));
      return total > 0 ? u : null;
    }))).filter((u): u is string => u !== null);
    return [
      ...both('/', { changeFrequency: 'daily', priority: 1 }),
      ...catalog.flatMap((u) => both(u, { changeFrequency: 'daily', priority: 0.9 })),
      ...both('/land-passport', { changeFrequency: 'monthly', priority: 0.8 }),
      ...both('/market', { lastModified: new Date(MARKET_UPDATED), changeFrequency: 'monthly', priority: 0.8 }),
      ...both('/areas', { changeFrequency: 'weekly', priority: 0.8 }),
      ...AREAS.flatMap((a) => both(`/areas/${a.slug}`, { changeFrequency: 'weekly', priority: 0.8 })),
      ...both('/guides', { changeFrequency: 'weekly', priority: 0.7 }),
      ...GUIDES.flatMap((g) => both(`/guides/${g.slug}`, { lastModified: new Date(g.updated), changeFrequency: 'monthly', priority: 0.7 })),
      ...both('/blog', { lastModified: new Date(POSTS.map((p) => p.updated).sort().at(-1)!), changeFrequency: 'weekly', priority: 0.7 }),
      ...TOPICS.flatMap((tp) => both(`/blog/topic/${tp.slug}`, { changeFrequency: 'weekly', priority: 0.5 })),
      ...POSTS.flatMap((p) => both(`/blog/${p.slug}`, { lastModified: new Date(p.updated), changeFrequency: 'monthly', priority: 0.7 })),
      ...both('/faq', { changeFrequency: 'monthly', priority: 0.6 }),
      ...both('/about', { changeFrequency: 'yearly', priority: 0.5 }),
      ...both('/for-agents', { changeFrequency: 'monthly', priority: 0.5 }),
      // правові сторінки іспанської адреси не мають
      { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
      { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    ];
  }

  if (key === 'developments') {
    const [developments, developers] = await Promise.all([sitemapDevelopments(), listDevelopers()]);
    return [
      ...both('/developments', { changeFrequency: 'weekly', priority: 0.8 }),
      ...developments.flatMap((d) => [
        ...both(`/developments/${d.slug}`, { lastModified: new Date(d.createdAt), changeFrequency: 'weekly', priority: 0.9, images: d.photos }),
        // вкладки, які є в кожного ЖК; решта (стройка, документи, новини) — лише коли заповнені
        ...(d.units ? ['layouts', 'contacts'] : ['contacts']).flatMap((t) => both(`/developments/${d.slug}/${t}`, { lastModified: new Date(d.createdAt), changeFrequency: 'weekly' as const, priority: 0.6 })),
      ]),
      ...both('/developers', { changeFrequency: 'weekly', priority: 0.6 }),
      ...developers.flatMap((d) => both(`/developers/${d.slug}`, { changeFrequency: 'weekly', priority: 0.6 })),
    ];
  }

  if (key === 'people') {
    const [agents, agencies] = await Promise.all([listAgents(), agencyBoard()]);
    return [
      ...both('/agents', { changeFrequency: 'weekly', priority: 0.6 }),
      ...agents.flatMap((a) => both(`/agents/${a.id}`, { changeFrequency: 'weekly', priority: 0.4 })),
      ...agencies.flatMap((a) => both(`/agency/${a.agency.id}`, { changeFrequency: 'weekly', priority: 0.5 })),
    ];
  }

  const chunk = /^listings-(\d+)$/.exec(key);
  if (!chunk) return [];
  const [listings, clones] = await Promise.all([sitemapListings(Number(chunk[1])), cloneMap(supabaseAnon()).catch(() => new Map<string, string>())]);
  return listings.filter((l) => !clones.has(l.id)).flatMap((l) => both(`/listings/${l.id}`, {
    lastModified: new Date(l.updatedAt), changeFrequency: 'weekly', priority: 0.8, images: l.photos,
  }));
}
