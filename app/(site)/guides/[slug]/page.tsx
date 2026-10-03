import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Blocks from '@/components/Blocks';
import Crumbs from '@/components/Crumbs';
import Faq from '@/components/Faq';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import Rich from '@/components/Rich';
import SourceList from '@/components/SourceList';
import { GUIDES, guideBySlug } from '@/lib/content/guides';
import { fmtDate } from '@/lib/format';
import { articleLd, breadcrumbLd, faqLd, graph } from '@/lib/seo';
import { SITE_NAME } from '@/lib/site';

export const dynamicParams = false;
export const generateStaticParams = () => GUIDES.map((g) => ({ slug: g.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  return {
    title: `${g.title} | ${SITE_NAME}`,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { title: g.title, description: g.description, type: 'article', url: `/guides/${g.slug}`,
      publishedTime: g.published, modifiedTime: g.updated },
  };
}

const anchor = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();

  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }, { name: g.short, path: `/guides/${g.slug}` }];
  const related = g.related.map(guideBySlug).filter((x) => x !== undefined);

  return (
    <article className="wrap prose">
      <JsonLd data={graph(articleLd(g), faqLd(g.faq), breadcrumbLd(crumbs))} />
      <Crumbs items={crumbs} />

      <h1>{g.title}</h1>
      <p className="prose__meta tiny muted">
        Updated <time dateTime={g.updated}>{fmtDate(g.updated)}</time> · By the {SITE_NAME} team · {g.sources.length} sources
      </p>

      <section className="answer" aria-label="Short answer">
        <span className="answer__k">Short answer</span>
        <p><Rich text={g.answer} /></p>
      </section>

      <section className="prose__facts">
        <h2>Key facts</h2>
        <ul>{g.keyFacts.map((f) => <li key={f}><Rich text={f} /></li>)}</ul>
      </section>

      <nav className="toc small" aria-label="Contents">
        <b>On this page</b>
        <ol>
          {g.sections.map((s) => <li key={s.h}><a href={`#${anchor(s.h)}`}>{s.h}</a></li>)}
          <li><a href="#faq">Frequently asked questions</a></li>
          <li><a href="#sources">Sources</a></li>
        </ol>
      </nav>

      {g.sections.map((s) => (
        <section key={s.h} id={anchor(s.h)}>
          <h2>{s.h}</h2>
          <Blocks body={s.body} />
        </section>
      ))}

      <section id="faq">
        <h2>Frequently asked questions</h2>
        <Faq items={g.faq} open={g.faq.length} />
      </section>

      <section id="sources">
        <h2>Sources</h2>
        <SourceList sources={g.sources} />
      </section>

      <section className="prose__cta">
        <div>
          <h2>See what is for sale on Roatán</h2>
          <p className="muted">Homes, condos and land from island agencies, each linked to the agency that holds it.</p>
        </div>
        <div className="prose__cta-btns">
          <Link className="btn btn--orange btn--lg" href="/listings?deal=sale">Browse listings <Icon name="arrowRight" size={18} /></Link>
          <Link className="btn btn--ghost btn--lg" href="/listings?type=land">Land with a passport</Link>
        </div>
      </section>

      {related.length > 0 && (
        <section>
          <h2>Related guides</h2>
          <div className="guide-list">
            {related.map((r) => (
              <Link key={r.slug} className="guide-card" href={`/guides/${r.slug}`}>
                <b>{r.title}</b>
                <span className="small muted">{r.description}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
