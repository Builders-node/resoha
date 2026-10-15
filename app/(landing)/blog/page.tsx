import type { Metadata } from 'next';
import BlogIndex from '@/components/BlogIndex';
import { localized } from '@/lib/seoMeta';
import { getT } from '@/lib/i18n/server';
import { SITE_NAME } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return localized('/blog', {
    title: `${t('Blog: real estate in Honduras, explained')} | ${SITE_NAME}`,
    description: t('Practical articles for property buyers, renters and investors in Honduras: buying safely, off-plan condos, scams, hurricanes, renting and where to buy in Roatán, San Pedro Sula and Tegucigalpa.'),
    alternates: { types: { 'application/rss+xml': [{ url: '/blog/rss.xml', title: `${SITE_NAME} Blog` }] } },
  });
}

export default function BlogPage() {
  return <BlogIndex />;
}
