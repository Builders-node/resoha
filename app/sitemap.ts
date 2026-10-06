import type { MetadataRoute } from 'next';
import { agencyBoard, listAgents, listDevelopments, queryListings } from '@/lib/db';
import { SITE_URL } from '@/lib/site';
import { AREAS } from '@/lib/content/areas';
import { GUIDES } from '@/lib/content/guides';
import { MARKET_UPDATED } from '@/lib/content/market';

/** Карта сайту: контентні сторінки плюс із бази кожне активне оголошення, ріелтор і агенція. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, agents, agencies, developments] = await Promise.all([queryListings(), listAgents(), agencyBoard(), listDevelopments()]);

  return [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/listings?deal=sale`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/listings?deal=rent`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/listings?type=land`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/agents`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/land-passport`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/market`, lastModified: new Date(MARKET_UPDATED), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/areas`, changeFrequency: 'weekly', priority: 0.8 },
    ...AREAS.map((a) => ({ url: `${SITE_URL}/areas/${a.slug}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    { url: `${SITE_URL}/guides`, changeFrequency: 'weekly', priority: 0.7 },
    ...GUIDES.map((g) => ({ url: `${SITE_URL}/guides/${g.slug}`, lastModified: new Date(g.updated), changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/about`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/for-agents`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE_URL}/developments`, changeFrequency: 'weekly', priority: 0.8 },
    ...developments.map((d) => ({ url: `${SITE_URL}/developments/${d.slug}`, lastModified: new Date(d.createdAt), changeFrequency: 'weekly' as const, priority: 0.9 })),
    ...listings.map((l) => ({
      url: `${SITE_URL}/listings/${l.id}`,
      lastModified: new Date(l.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...agents.map((a) => ({ url: `${SITE_URL}/agents/${a.id}`, changeFrequency: 'weekly' as const, priority: 0.4 })),
    ...agencies.map((a) => ({ url: `${SITE_URL}/agency/${a.agency.id}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
  ];
}
