import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// '/agent' без слеша закрив би й публічні /agents/<id>: robots.txt зіставляє префікс
const PRIVATE = ['/admin', '/agent/', '/agent$', '/account', '/api/', '/login', '/signup', '/forgot', '/reset', '/unsubscribe'];

/**
 * Кабінети й API індексувати нема чого; усе інше — відкрите. AI-пошуковиків називаємо явно:
 * частина з них за замовчуванням обережна, а цитування в їхніх відповідях — окремий канал трафіку.
 */
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'Bingbot'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: AI_BOTS, allow: '/', disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
