import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Кабінети й API індексувати нема чого; усе інше — відкрите. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/agent', '/account', '/api/', '/login', '/signup', '/forgot', '/reset'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
