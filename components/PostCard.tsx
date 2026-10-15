import Link from 'next/link';
import BlogCover from './BlogCover';
import Icon from './Icon';
import { readingMinutes, topicBySlug, type Post } from '@/lib/content/blog';
import { fmtDate } from '@/lib/format';
import type { Lang, T } from '@/lib/i18n';

/** Картка статті у списку блогу; `feature` — велика горизонтальна для найновішої. */
export default function PostCard({ post, href, lang, t, feature = false }: { post: Post; href: string; lang: Lang; t: T; feature?: boolean }) {
  const topic = t(topicBySlug(post.topic)?.name ?? '');
  return (
    <Link className={`post-card${feature ? ' post-card--feature' : ''}`} href={href}>
      <BlogCover topic={post.topic} label={topic} icon={post.icon} size={feature ? 'feature' : 'card'} />
      <span className="post-card__body">
        <span className="post-card__meta tiny muted">
          <b>{topic}</b> · <time dateTime={post.published}>{fmtDate(post.published, lang)}</time> · {t('{n} min read', { n: readingMinutes(post) })}
        </span>
        <span className="post-card__title">{post.title}</span>
        <span className="post-card__desc small muted">{post.description}</span>
        {feature && <span className="link-accent small">{t('Read article')} <Icon name="arrowRight" size={16} /></span>}
      </span>
    </Link>
  );
}
