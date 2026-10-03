import type { Metadata } from 'next';
import Link from 'next/link';
import Crumbs from '@/components/Crumbs';
import Faq from '@/components/Faq';
import JsonLd from '@/components/JsonLd';
import { SITE_FAQ } from '@/lib/content/faq';
import { GUIDES } from '@/lib/content/guides';
import { breadcrumbLd, faqLd, graph } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Roatán property FAQ: buying, costs, title and Resoha | ${SITE_NAME}`,
  description: 'Answers to the most common questions about buying property on Roatán and using Resoha: foreign ownership, prices, closing costs, the land passport and contacting agents.',
  alternates: { canonical: '/faq' },
};

export default function FaqPage() {
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'FAQ', path: '/faq' }];
  return (
    <div className="wrap page prose">
      <JsonLd data={graph(breadcrumbLd(crumbs), faqLd(SITE_FAQ))} />
      <Crumbs items={crumbs} />
      <h1>Frequently asked questions</h1>
      <p className="page__lead">About buying property on Roatán, and about how Resoha works.</p>
      <Faq items={SITE_FAQ} open={SITE_FAQ.length} />
      <h2>Go deeper</h2>
      <ul>
        {GUIDES.map((g) => <li key={g.slug}><Link className="link-accent" href={`/guides/${g.slug}`}>{g.title}</Link></li>)}
      </ul>
    </div>
  );
}
