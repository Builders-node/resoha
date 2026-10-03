import { ImageResponse } from 'next/og';
import { getListing } from '@/lib/db';
import { fmtPrice, photoUrl, specLine } from '@/lib/format';
import { LOGO_PATH, LOGO_VIEWBOX } from '@/lib/logo';
import { SITE_URL } from '@/lib/site';

export const alt = 'Property on Resoha Roatán';
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

  const raw = l ? photoUrl(l.photos[0]) : '';
  const photo = raw.startsWith('/') ? `${SITE_URL}${raw}` : raw;

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
            <svg width="62" height="58" viewBox={LOGO_VIEWBOX}><path d={LOGO_PATH} fill="#ff4800" /></svg>
            <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, letterSpacing: 4 }}>RESOHA ROATÁN</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', fontSize: 30, color: '#ff4800', fontWeight: 800 }}>
              {l ? `${l.deal === 'rent' ? 'For rent' : 'For sale'} · ${l.neighborhood}` : 'Roatán, Bay Islands'}
            </div>
            <div style={{ display: 'flex', fontSize: 60, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1.5 }}>
              {l ? l.title : 'Property on Roatán'}
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
