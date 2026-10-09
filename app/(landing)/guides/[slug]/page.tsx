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
import { localizeContent } from '@/lib/content/localize';
import { makeT } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
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
  const lang = await getLang();
  const t = makeT(lang);
  // видимий текст — мовою відвідувача; JSON-LD нижче лишається з англійського оригіналу
  const lg = localizeContent(g, t);

  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Guides', path: '/guides' }, { name: g.short, path: `/guides/${g.slug}` }];
  const related = g.related.map(guideBySlug).filter((x) => x !== undefined).map((r) => localizeContent(r, t));

  return (
    <article className="wrap prose page-top">
      <JsonLd data={graph(articleLd(g), faqLd(g.faq), breadcrumbLd(crumbs))} />

      <h1>{lg.title}</h1>
      <p className="prose__meta tiny muted">
        {t('Updated')} <time dateTime={g.updated}>{fmtDate(g.updated, lang)}</time> · {t('By the {site} team', { site: SITE_NAME })} · {t('{n} sources', { n: g.sources.length })}
      </p>

      <section className="answer" aria-label={t('Short answer')}>
        <span className="answer__k">{t('Short answer')}</span>
        <p><Rich text={lg.answer} /></p>
      </section>

      <section className="prose__facts">
        <h2>{t('Key facts')}</h2>
        <ul>{lg.keyFacts.map((f) => <li key={f}><Rich text={f} /></li>)}</ul>
      </section>

      <nav className="toc small" aria-label={t('Contents')}>
        <b>{t('On this page')}</b>
        <ol>
          {lg.sections.map((s, i) => <li key={s.h}><a href={`#${anchor(g.sections[i].h)}`}>{s.h}</a></li>)}
          <li><a href="#faq">{t('Frequently asked questions')}</a></li>
          <li><a href="#sources">{t('Sources')}</a></li>
        </ol>
      </nav>

      {lg.sections.map((s, i) => (
        <section key={s.h} id={anchor(g.sections[i].h)}>
          <h2>{s.h}</h2>
          <Blocks body={s.body} />
        </section>
      ))}

      <section id="faq">
        <h2>{t('Frequently asked questions')}</h2>
        <Faq items={lg.faq} open={lg.faq.length} />
      </section>

      <section id="sources">
        <h2>{t('Sources')}</h2>
        <SourceList sources={g.sources} />
      </section>

      <section className="prose__cta">
        <div>
          <h2>{t('See what is for sale on Roatán')}</h2>
          <p className="muted">{t('Homes, condos and land from island agencies, each linked to the agency that holds it.')}</p>
        </div>
        <div className="prose__cta-btns">
          <Link className="btn btn--orange btn--lg" href="/listings?deal=sale">{t('Browse listings')} <Icon name="arrowRight" size={18} /></Link>
          <Link className="btn btn--ghost btn--lg" href="/listings?type=land">{t('Land with a passport')}</Link>
        </div>
      </section>

      {related.length > 0 && (
        <section>
          <h2>{t('Related guides')}</h2>
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
      <Crumbs items={crumbs.map((c) => ({ ...c, name: t(c.name) }))} />
    </article>
  );
}
