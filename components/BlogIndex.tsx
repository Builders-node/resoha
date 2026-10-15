import Link from 'next/link';
import Crumbs from './Crumbs';
import Icon from './Icon';
import JsonLd from './JsonLd';
import PostCard from './PostCard';
import { POSTS_SORTED, TOPICS, topicBySlug, type Topic } from '@/lib/content/blog';
import { localizeContent } from '@/lib/content/localize';
import { makeT } from '@/lib/i18n';
import { getLang, getLp } from '@/lib/i18n/server';
import { blogLd, breadcrumbLd, graph } from '@/lib/seo';

/** Список статей: увесь блог або одна рубрика. Найновіша стаття — великою карткою зверху. */
export default async function BlogIndex({ topic }: { topic?: Topic }) {
  const lp = await getLp();
  const lang = await getLang();
  const t = makeT(lang);
  const current = topic ? topicBySlug(topic) : undefined;
  const posts = POSTS_SORTED.filter((p) => !topic || p.topic === topic);
  const shown = posts.map((p) => localizeContent(p, t));
  const [first, ...rest] = shown;

  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }];
  if (current) crumbs.push({ name: current.name, path: `/blog/topic/${current.slug}` });

  return (
    <div className="wrap page blog">
      <JsonLd data={graph(breadcrumbLd(crumbs), blogLd(posts))} />
      <header className="blog__head">
        <span className="hero__eyebrow">{current ? t('Blog') : t('Hogarli Blog')}</span>
        <h1>{current ? t(current.name) : t('Real estate in Honduras, explained')}</h1>
        <p className="page__lead">
          {current ? t(current.blurb) : t('Practical articles for buyers, renters and investors: how to buy safely, what to ask developers, where to live and how the market works in Roatán, San Pedro Sula and Tegucigalpa.')}
        </p>
      </header>

      <nav className="chip-row blog__topics" aria-label={t('Topics')}>
        <Link className={`chip-btn${!topic ? ' is-on' : ''}`} href={lp('/blog')} aria-current={!topic ? 'page' : undefined}>{t('All articles')}</Link>
        {TOPICS.map((tp) => (
          <Link key={tp.slug} className={`chip-btn${tp.slug === topic ? ' is-on' : ''}`} href={lp(`/blog/topic/${tp.slug}`)}
            aria-current={tp.slug === topic ? 'page' : undefined}>
            {t(tp.name)}
          </Link>
        ))}
      </nav>

      {first ? (
        <>
          <PostCard post={first} href={lp(`/blog/${first.slug}`)} lang={lang} t={t} feature />
          {rest.length > 0 && (
            <div className="post-grid">
              {rest.map((p) => <PostCard key={p.slug} post={p} href={lp(`/blog/${p.slug}`)} lang={lang} t={t} />)}
            </div>
          )}
        </>
      ) : (
        <p className="muted">{t('No articles in this topic yet.')}</p>
      )}

      <section className="blog__more">
        <div>
          <h2>{t('Looking for step-by-step answers?')}</h2>
          <p className="muted">{t('Our buying guides cover foreign ownership, closing costs, title checks and rental income, with a source for every figure.')}</p>
        </div>
        <div className="prose__cta-btns">
          <Link className="btn btn--primary" href={lp('/guides')}>{t('Read the guides')} <Icon name="arrowRight" size={18} /></Link>
          <a className="btn btn--ghost" href={lp('/blog/rss.xml')}>{t('RSS feed')}</a>
        </div>
      </section>

      <Crumbs items={crumbs.map((c) => ({ ...c, name: t(c.name) }))} />
    </div>
  );
}
