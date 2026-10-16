'use client';

import Link from 'next/link';
import { useState } from 'react';
import BlogCover from './BlogCover';
import Icon from './Icon';
import type { Topic } from '@/lib/content/blog';

export type HomePost = {
  slug: string; href: string; title: string; topic: Topic; topicName: string;
  icon?: string; published: string; date: string;
};

/** Вкладки й сітка блогу на головній. Усі картки вже в HTML, вкладка лише фільтрує. */
export default function HomeBlogTabs({ posts, tabs, limit, allLabel }: {
  posts: HomePost[]; tabs: { slug: Topic; name: string }[]; limit: number; allLabel: string;
}) {
  const [tab, setTab] = useState<Topic | ''>('');
  const shown = posts.filter((p) => !tab || p.topic === tab).slice(0, limit);

  return (
    <>
      {tabs.length > 0 && (
        <div className="chip-row home-blog__tabs" role="tablist">
          {[{ slug: '' as const, name: allLabel }, ...tabs].map((tp) => (
            <button key={tp.slug} type="button" role="tab" aria-selected={tab === tp.slug}
              className={`chip-btn${tab === tp.slug ? ' is-on' : ''}`} onClick={() => setTab(tp.slug)}>
              {tp.name}
            </button>
          ))}
        </div>
      )}
      <div className="home-blog">
        {shown.map((p) => (
          <Link key={p.slug} href={p.href} className="home-blog__card">
            <BlogCover topic={p.topic} label={p.topicName} icon={p.icon} size="thumb" />
            <span className="home-blog__body">
              <time className="home-blog__date" dateTime={p.published}>{p.date}</time>
              <span className="home-blog__title">{p.title}</span>
            </span>
            <Icon name="chevron" size={22} className="home-blog__go" />
          </Link>
        ))}
      </div>
    </>
  );
}
