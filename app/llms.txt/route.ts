import { AREAS } from '@/lib/content/areas';
import { SITE_FAQ } from '@/lib/content/faq';
import { GUIDES } from '@/lib/content/guides';
import { MARKET_FACTS, MARKET_UPDATED } from '@/lib/content/market';
import { plain } from '@/components/Rich';
import { ORG_DESCRIPTION } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';

/**
 * llms.txt (llmstxt.org): коротка карта сайту для AI-асистентів — хто ми, які сторінки
 * відповідають на які питання і цифри з джерелами. Збирається з того самого контенту, що й сторінки.
 */
export const dynamic = 'force-static';

export function GET() {
  const u = (p: string) => `${SITE_URL}${p}`;
  const body = [
    `# ${SITE_NAME}`,
    '',
    `> ${ORG_DESCRIPTION}`,
    '',
    'Resoha is a listing platform, not a broker. Every listing links back to the island agency that holds it. Buyers contact agents directly; Resoha takes no commission from buyers. Land listings carry a "land passport": title, road access, electricity, water, survey, ZOLITUR permit, zone and slope, each marked confirmed or not with the date of the check.',
    '',
    '## Key pages',
    `- [Property for sale on Roatán](${u('/listings?deal=sale')}): homes, condos and land, on a map`,
    `- [Long-term rentals](${u('/listings?deal=rent')})`,
    `- [Land and lots](${u('/listings?type=land')}): filter by "Ready to build"`,
    `- [Land passport](${u('/land-passport')}): what is checked on every lot and how readiness is scored`,
    `- [Roatán market report](${u('/market')}): key figures with sources`,
    `- [Areas of Roatán](${u('/areas')}): prices and character of each neighbourhood`,
    `- [Buying guides](${u('/guides')})`,
    `- [FAQ](${u('/faq')})`,
    `- [About Resoha](${u('/about')})`,
    `- [For agents](${u('/for-agents')})`,
    '',
    '## Guides',
    ...GUIDES.map((g) => `- [${g.title}](${u(`/guides/${g.slug}`)}): ${plain(g.answer)}`),
    '',
    '## Areas',
    ...AREAS.map((a) => `- [${a.name}](${u(`/areas/${a.slug}`)}): ${a.summary}${a.priceRange ? ` Typical prices ${a.priceRange} (${a.priceSource?.name}).` : ''}`),
    '',
    `## Roatán market figures (checked ${MARKET_UPDATED})`,
    ...MARKET_FACTS.map((f) => `- ${f.label}: ${f.value}${f.note ? ` (${f.note})` : ''}. Source: ${f.source.name}, ${f.source.url}`),
    '',
    '## FAQ',
    ...SITE_FAQ.flatMap((f) => [`### ${f.q}`, plain(f.a), '']),
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
