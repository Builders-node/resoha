import type { MetadataRoute } from 'next';
import { agencyBoard, listAgents, queryListings } from '@/lib/db';
import { SITE_URL } from '@/lib/site';

/** Карта сайту з бази: кожне активне оголошення, ріелтор і агенція. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [listings, agents, agencies] = await Promise.all([queryListings(), listAgents(), agencyBoard()]);

  return [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/listings?deal=sale`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/listings?deal=rent`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/listings?type=land`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/agents`, changeFrequency: 'weekly', priority: 0.6 },
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
