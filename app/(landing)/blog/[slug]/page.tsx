import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BlogCover from '@/components/BlogCover';
import Blocks from '@/components/Blocks';
import Crumbs from '@/components/Crumbs';
import Icon from '@/components/Icon';
import JsonLd from '@/components/JsonLd';
import PostCard from '@/components/PostCard';
import Rich, { plain } from '@/components/Rich';
import ShareLinks from '@/components/ShareLinks';
import SourceList from '@/components/SourceList';
import { POSTS, postBySlug, readingMinutes, topicBySlug } from '@/lib/content/blog';
import { guideBySlug } from '@/lib/content/guides';
import { localizeContent } from '@/lib/content/localize';
import { fmtDate } from '@/lib/format';
import { makeT } from '@/lib/i18n';
import { localePath } from '@/lib/i18n/paths';
import { getLang, getLp } from '@/lib/i18n/server';
import { blogPostingLd, breadcrumbLd, graph } from '@/lib/seo';
import { localized } from '@/lib/seoMeta';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export const dynamicParams = false;
export const generateStaticParams = () => POSTS.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = postBySlug((await params).slug);
  if (!p) return {};
  const t = makeT(await getLang());
  const title = t(p.seoTitle ?? p.title);
  const description = t(p.description);
  const image = { url: `/blog/${p.slug}/cover.png`, width: 1200, height: 630, alt: p.title };
  return localized(`/blog/${p.slug}`, {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { types: { 'application/rss+xml': [{ url: '/blog/rss.xml', title: `${SITE_NAME} Blog` }] } },
    openGraph: { title, description, type: 'article', publishedTime: p.published, modifiedTime: p.updated,
      section: t(topicBySlug(p.topic)?.name ?? ''), images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  });
}

/** Якір розділу — з англійського заголовка, щоб посилання на розділ не залежали від мови. */
const anchor = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = postBySlug((await params).slug);
  if (!post) notFound();
  const lp = await getLp();
  const lang = await getLang();
  const t = makeT(lang);
  const p = localizeContent(post, t);
  const topic = topicBySlug(post.topic)!;
  const minutes = readingMinutes(post);

  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: topic.name, path: `/blog/topic/${topic.slug}` },
    { name: post.title, path: `/blog/${post.slug}` },
  ];
  const related = post.related.map(postBySlug).filter((x) => x !== undefined).map((r) => localizeContent(r, t));
  const guides = post.guides.map(guideBySlug).filter((x) => x !== undefined).map((g) => localizeContent(g, t));
  const url = `${SITE_URL}${localePath(lang, `/blog/${post.slug}`)}`;

  return (
    <article className="wrap page-top blog-post">
      <JsonLd data={graph(
        blogPostingLd({ ...post, title: plain(p.title), description: plain(p.description), lead: p.lead }),
        breadcrumbLd(crumbs),
      )} />

      <header className="blog-hero">
        <Link className="blog-hero__topic" href={lp(`/blog/topic/${topic.slug}`)}>
          <Icon name={topic.icon} size={16} /> {t(topic.name)}
        </Link>
        <h1>{p.title}</h1>
        <p className="blog-hero__lead"><Rich text={p.lead} /></p>
        <p className="blog-hero__meta small">
          {t('By the {site} team', { site: SITE_NAME })} · <time dateTime={post.published}>{fmtDate(post.published, lang)}</time>
          {post.updated !== post.published && <> · {t('Updated')} <time dateTime={post.updated}>{fmtDate(post.updated, lang)}</time></>}
          {' · '}{t('{n} min read', { n: minutes })}
        </p>
      </header>
      <BlogCover topic={post.topic} label={t(topic.name)} icon={post.icon} size="wide" />

      <div className="blog-post__cols">
        <aside className="blog-post__aside">
          <nav className="toc small" aria-label={t('Contents')}>
            <b>{t('In this article')}</b>
            <ol>
              {p.sections.map((s, i) => <li key={s.h}><a href={`#${anchor(post.sections[i].h)}`}>{s.h}</a></li>)}
              {post.sources.length > 0 && <li><a href="#sources">{t('Sources')}</a></li>}
            </ol>
          </nav>
          <ShareLinks url={url} title={plain(p.title)} />
        </aside>

        <div className="prose blog-post__body">
          <section className="prose__facts">
            <h2>{t('Key takeaways')}</h2>
            <ul>{p.takeaways.map((f) => <li key={f}><Rich text={f} /></li>)}</ul>
          </section>

          {p.sections.map((s, i) => (
            <section key={s.h} id={anchor(post.sections[i].h)}>
              <h2>{s.h}</h2>
              <Blocks body={s.body} />
            </section>
          ))}

          {post.sources.length > 0 && (
            <section id="sources">
              <h2>{t('Sources')}</h2>
              <SourceList sources={post.sources} />
            </section>
          )}

          <section className="prose__cta">
            <div>
              <h2>{t('Find your place in Honduras')}</h2>
              <p>{t('Homes, condos, rentals and land in Roatán, San Pedro Sula and Tegucigalpa, each linked to the agency that holds it.')}</p>
            </div>
            <div className="prose__cta-btns">
              <Link className="btn btn--orange btn--lg" href={lp('/listings?deal=sale')}>{t('Browse listings')} <Icon name="arrowRight" size={18} /></Link>
              <Link className="btn btn--ghost btn--lg" href={lp('/developments')}>{t('New developments')}</Link>
            </div>
          </section>

          {guides.length > 0 && (
            <section>
              <h2>{t('Related guides')}</h2>
              <div className="guide-list">
                {guides.map((g) => (
                  <Link key={g.slug} className="guide-card" href={lp(`/guides/${g.slug}`)}>
                    <b>{g.title}</b>
                    <span className="small muted">{g.description}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="blog-post__related">
          <h2>{t('Keep reading')}</h2>
          <div className="post-grid">
            {related.map((r) => <PostCard key={r.slug} post={r} href={lp(`/blog/${r.slug}`)} lang={lang} t={t} />)}
          </div>
        </section>
      )}

      <Crumbs items={crumbs.map((c) => ({ ...c, name: t(c.name) }))} />
    </article>
  );
}
