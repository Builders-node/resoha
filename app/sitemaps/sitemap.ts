import type { MetadataRoute } from 'next';
import { agencyBoard, listAgents, listDevelopers } from '@/lib/db';
import { AREAS } from '@/lib/content/areas';
import { GUIDES } from '@/lib/content/guides';
import { MARKET_UPDATED } from '@/lib/content/market';
import { SITE_URL } from '@/lib/site';
import { fromParams } from '@/lib/filters';
import { catalogUrl } from '@/lib/catalogSeo';
import { both, sitemapDevelopments, sitemapIds, sitemapListings } from '@/lib/sitemapData';

/**
 * Карта сайту кількома файлами (/sitemaps/sitemap/<id>.xml), список файлів — у /sitemap.xml.
 * Кожна публічна сторінка йде двічі: англійською й /es, з hreflang між ними;
 * оголошення й ЖК — ще й з фото (image sitemap).
 */
export async function generateSitemaps() {
  return (await sitemapIds()).map((id) => ({ id }));
}

/** Каталог з фільтрами — лише ті комбінації, які сторінка сама вважає індексованими. */
const CATALOG = [
  'deal=sale', 'deal=rent',
  'deal=sale&type=house', 'deal=sale&type=condo', 'deal=sale&type=land', 'deal=sale&type=commercial',
  'deal=rent&type=house', 'deal=rent&type=condo',
  'deal=sale&oceanfront=1', 'deal=sale&type=land&ready=1',
].map((q) => catalogUrl(fromParams(new URLSearchParams(q))));

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const key = String(await id);

  if (key === 'pages') {
    return [
      ...both('/', { changeFrequency: 'daily', priority: 1 }),
      ...CATALOG.flatMap((u) => both(u, { changeFrequency: 'daily', priority: 0.9 })),
      ...both('/land-passport', { changeFrequency: 'monthly', priority: 0.8 }),
      ...both('/market', { lastModified: new Date(MARKET_UPDATED), changeFrequency: 'monthly', priority: 0.8 }),
      ...both('/areas', { changeFrequency: 'weekly', priority: 0.8 }),
      ...AREAS.flatMap((a) => both(`/areas/${a.slug}`, { changeFrequency: 'weekly', priority: 0.8 })),
      ...both('/guides', { changeFrequency: 'weekly', priority: 0.7 }),
      ...GUIDES.flatMap((g) => both(`/guides/${g.slug}`, { lastModified: new Date(g.updated), changeFrequency: 'monthly', priority: 0.7 })),
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
        ...['layouts', 'contacts'].flatMap((t) => both(`/developments/${d.slug}/${t}`, { lastModified: new Date(d.createdAt), changeFrequency: 'weekly' as const, priority: 0.6 })),
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
  const listings = await sitemapListings(Number(chunk[1]));
  return listings.flatMap((l) => both(`/listings/${l.id}`, {
    lastModified: new Date(l.updatedAt), changeFrequency: 'weekly', priority: 0.8, images: l.photos,
  }));
}
