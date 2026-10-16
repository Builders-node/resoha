import Link from 'next/link';
import Icon from './Icon';
import HomeBlogTabs, { type HomePost } from './HomeBlogTabs';
import { POSTS_SORTED, TOPICS } from '@/lib/content/blog';
import { fmtDate } from '@/lib/format';
import type { Lang, T } from '@/lib/i18n';

/** Скільки статей у вкладці: три ряди по три, як у блоці новин ЛУН. */
const LIMIT = 9;

/** Блок блогу на головній: найновіші статті, вкладки — рубрики, у яких щось є. */
export default function HomeBlog({ lang, t, lp }: { lang: Lang; t: T; lp: (path: string) => string }) {
  if (!POSTS_SORTED.length) return null;
  const posts: HomePost[] = POSTS_SORTED.map((p) => ({
    slug: p.slug,
    href: lp(`/blog/${p.slug}`),
    title: t(p.title),
    topic: p.topic,
    topicName: t(TOPICS.find((tp) => tp.slug === p.topic)?.name ?? ''),
    icon: p.icon,
    published: p.published,
    date: fmtDate(p.published, lang),
  }));
  // рубрика з однією статтею — не вкладка, а порожнеча; беремо лише ті, де є хоч дві,
  // і показуємо вкладки, коли таких рубрик принаймні дві — інакше «Усі» плюс одна нічого не дають
  const full = TOPICS.filter((tp) => posts.filter((p) => p.topic === tp.slug).length > 1)
    .map((tp) => ({ slug: tp.slug, name: t(tp.name) }));
  const tabs = full.length > 1 ? full : [];

  return (
    <section className="section">
      <div className="wrap">
        <div className="section__head">
          <h2>{t('Real estate news & articles')}</h2>
          <Link className="btn btn--primary" href={lp('/blog')}>{t('All articles')} <Icon name="arrowRight" size={18} /></Link>
        </div>
        <HomeBlogTabs posts={posts} tabs={tabs} limit={LIMIT} allLabel={t('Latest')} />
      </div>
    </section>
  );
}
