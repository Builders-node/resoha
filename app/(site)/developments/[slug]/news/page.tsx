import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DevelopmentShell from '@/components/DevelopmentShell';
import Photo from '@/components/Photo';
import { developmentContext, developmentMetadata } from '@/lib/developmentPage';
import { fmtDay } from '@/lib/units';
import { getLang } from '@/lib/i18n/server';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return developmentMetadata((await params).slug, {
    path: 'news', label: 'News', about: 'Sales launches, price changes and construction milestones.',
  });
}

export default async function NewsPage({ params }: Props) {
  const ctx = await developmentContext((await params).slug);
  if (!ctx.news.length) notFound();
  const lang = await getLang();
  return (
    <DevelopmentShell ctx={ctx} active="news" title="News">
      <div className="news">
        {ctx.news.map((n) => (
          <article key={n.id} id={`n-${n.id}`} className="news__item">
            {n.photo && <div className="news__img"><Photo src={n.photo} alt="" /></div>}
            <div>
              <time className="small muted" dateTime={n.publishedOn}>{fmtDay(n.publishedOn, lang)}</time>
              <h2 className="news__title">{n.title}</h2>
              {n.body && <p className="news__body">{n.body}</p>}
            </div>
          </article>
        ))}
      </div>
    </DevelopmentShell>
  );
}
