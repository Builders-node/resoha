import { connection } from 'next/server';
import { SITE_URL } from '@/lib/site';
import { sitemapIds } from '@/lib/sitemapData';

/**
 * Індекс карти сайту: /sitemap.xml лишається тією самою адресою (її знають robots.txt
 * і Search Console), а всередині — список файлів з app/sitemaps/sitemap.ts.
 */
export async function GET() {
  await connection();
  const ids = await sitemapIds();
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ids.map((id) => `<sitemap>\n<loc>${SITE_URL}/sitemaps/sitemap/${id}.xml</loc>\n</sitemap>\n`).join('')
    + '</sitemapindex>\n';
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=0, must-revalidate' },
  });
}
