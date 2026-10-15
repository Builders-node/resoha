import { plain } from '@/components/Rich';
import { POSTS_SORTED, topicBySlug } from '@/lib/content/blog';
import { makeT } from '@/lib/i18n';
import { localePath } from '@/lib/i18n/paths';
import { getLang } from '@/lib/i18n/server';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** RSS блогу: /blog/rss.xml англійською, /es/blog/rss.xml — іспанською (мову задає proxy). */
export async function GET() {
  const lang = await getLang();
  const t = makeT(lang);
  const u = (p: string) => `${SITE_URL}${localePath(lang, p)}`;
  const items = POSTS_SORTED.map((p) => [
    '<item>',
    `<title>${esc(t(p.title))}</title>`,
    `<link>${esc(u(`/blog/${p.slug}`))}</link>`,
    `<guid isPermaLink="true">${esc(u(`/blog/${p.slug}`))}</guid>`,
    `<description>${esc(plain(t(p.description)))}</description>`,
    `<category>${esc(t(topicBySlug(p.topic)?.name ?? ''))}</category>`,
    `<pubDate>${new Date(`${p.published}T12:00:00Z`).toUTCString()}</pubDate>`,
    '</item>',
  ].join(''));
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${esc(`${SITE_NAME} Blog`)}</title>`,
    `<link>${esc(u('/blog'))}</link>`,
    `<atom:link href="${esc(u('/blog/rss.xml'))}" rel="self" type="application/rss+xml"/>`,
    `<description>${esc(t('Practical articles for buyers, renters and investors: how to buy safely, what to ask developers, where to live and how the market works in Roatán, San Pedro Sula and Tegucigalpa.'))}</description>`,
    `<language>${lang === 'es' ? 'es-HN' : 'en-US'}</language>`,
    ...items,
    '</channel>',
    '</rss>',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
