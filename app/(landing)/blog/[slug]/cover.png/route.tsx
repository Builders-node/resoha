import { ImageResponse } from 'next/og';
import { POSTS, postBySlug, readingMinutes, topicBySlug } from '@/lib/content/blog';
import { LOGO_PATH, LOGO_VIEWBOX } from '@/lib/logo';

const size = { width: 1200, height: 630 };
export const dynamicParams = false;
export const generateStaticParams = () => POSTS.map((p) => ({ slug: p.slug }));

/** Фон картки — той самий градієнт рубрики, що й обкладинка на сайті (.blog-cover--*). */
const BG: Record<string, string> = {
  buying: 'linear-gradient(135deg, #ff6a2b 0%, #c53600 100%)',
  'new-builds': 'linear-gradient(135deg, #2b2b33 0%, #0f0f10 100%)',
  living: 'linear-gradient(135deg, #12a3a8 0%, #0b5a73 100%)',
  market: 'linear-gradient(135deg, #3a4a86 0%, #1b2340 100%)',
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
        padding: 72, background: BG[p?.topic ?? 'new-builds'], color: '#fff', fontFamily: 'sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 30, fontWeight: 700 }}>
          <svg width="52" height="49" viewBox={LOGO_VIEWBOX}><path d={LOGO_PATH} fill={p?.topic === 'buying' ? '#fff' : '#ff4800'} /></svg>
          <span>Hogarli Blog</span>
          <span style={{ opacity: 0.6 }}>·</span>
          <span style={{ opacity: 0.85 }}>{topic}</span>
        </div>
        <div style={{ display: 'flex', fontSize: (p?.title.length ?? 0) > 70 ? 58 : 68, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.08 }}>
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
