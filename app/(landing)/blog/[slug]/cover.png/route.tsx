import { ImageResponse } from 'next/og';
import { POSTS, postBySlug, readingMinutes, topicBySlug } from '@/lib/content/blog';
import Logo from '@/components/Logo';

const size = { width: 1200, height: 630 };
export const dynamicParams = false;
export const generateStaticParams = () => POSTS.map((p) => ({ slug: p.slug }));

/** Фон картки — той самий пастельний колір рубрики, що й обкладинка на сайті (.blog-cover--*). */
const BG: Record<string, string> = {
  buying: '#fdd892',
  'new-builds': '#a9c4f5',
  living: '#9fdccf',
  market: '#f7b9b2',
};

/**
 * Картка для соцмереж, месенджерів і JSON-LD: рубрика, заголовок і час читання. Англійською для обох мов.
 * Звичайний маршрут, а не opengraph-image: у того адреса з хешем, а розмітці статті потрібна стала.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = postBySlug((await params).slug);
  const topic = p ? topicBySlug(p.topic)?.name : '';
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: 72, background: BG[p?.topic ?? 'new-builds'], color: '#0f0f10', fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, fontWeight: 700 }}>
          <Logo size={54} />
          <span>Hogarli Blog</span>
          <span style={{ opacity: 0.6 }}>·</span>
          <span style={{ opacity: 0.85 }}>{topic}</span>
        </div>
        <div style={{ display: 'flex', fontSize: (p?.title.length ?? 0) > 70 ? 58 : 68, fontWeight: 500, letterSpacing: -2, lineHeight: 1.08 }}>
          {p?.title ?? 'Hogarli Blog'}
        </div>
        <div style={{ display: 'flex', fontSize: 28, opacity: 0.8 }}>
          {p ? `${readingMinutes(p)} min read · hogarli.com` : 'hogarli.com'}
        </div>
      </div>
    ),
    size,
  );
}
