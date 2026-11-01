import { ImageResponse } from 'next/og';
import { getListing } from '@/lib/db';
import { fmtPrice, photoUrl, specLine } from '@/lib/format';
import Logo from '@/components/Logo';
import { SITE_URL } from '@/lib/site';

export const alt = 'Property on Hogarli';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Картка для превʼю посилання: назва, ціна, район. Якщо в обʼєкта є справжнє
 * фото — воно йде фоном; якщо ні, картка лишається на брендовому тлі й нічого
 * не вигадує замість знімка.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await getListing(id);

  const photo = l ? await pickPhoto(l.photos) : '';

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', position: 'relative',
        background: '#131316', color: '#fff', fontFamily: 'sans-serif',
      }}>
        {photo && (
          <img src={photo} alt="" width={1200} height={630}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        {photo && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            background: 'linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.2) 35%, rgba(0,0,0,.85) 100%)',
          }} />
        )}

        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          width: '100%', height: '100%', padding: 64,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Logo size={62} />
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, letterSpacing: 4 }}>HOGARLI</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', fontSize: 30, color: '#ff4800', fontWeight: 800 }}>
              {l ? `${l.deal === 'rent' ? 'For rent' : 'For sale'} · ${l.neighborhood}` : 'Honduras'}
            </div>
            <div style={{ display: 'flex', fontSize: 60, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5 }}>
              {l ? l.title : 'Property in Honduras'}
            </div>
            {l && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 26 }}>
                <div style={{ display: 'flex', fontSize: 58, fontWeight: 800 }}>{fmtPrice(l.price, l.deal)}</div>
                <div style={{ display: 'flex', fontSize: 30, opacity: 0.8 }}>{specLine(l)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}

/** Генератор превʼю читає лише JPEG, PNG і GIF — avif і webp валили картку (див. помилки Vercel). */
const READABLE = /^image\/(jpeg|png|gif)/;

/**
 * Перше фото, яке генератор зможе прочитати, — одразу як data URL, щоб не качати двічі.
 * Encuentra24 (Cloudinary) з f_auto віддає avif — просимо JPEG. Нічого не підійшло — картка без фото.
 */
async function pickPhoto(photos: string[]): Promise<string> {
  for (const src of photos.slice(0, 4)) {
    let url = photoUrl(src);
    if (!url) continue;
    if (url.startsWith('/')) url = `${SITE_URL}${url}`;
    url = url.replace('/f_auto/', '/f_jpg/');
    try {
      const res = await fetch(url, { headers: { Accept: 'image/jpeg,image/png,image/gif' }, signal: AbortSignal.timeout(4000) });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !READABLE.test(type)) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 4_000_000) continue;
      return `data:${type.split(';')[0]};base64,${buf.toString('base64')}`;
    } catch {
      // фото недоступне — пробуємо наступне
    }
  }
  return '';
}
