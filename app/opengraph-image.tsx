import { ImageResponse } from 'next/og';
import { LOGO_PATH, LOGO_VIEWBOX } from '@/lib/logo';

export const alt = 'Resoha Roatán — property on the Bay Islands';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Картка за замовчуванням для всіх сторінок, де немає власної. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 80, background: '#131316', color: '#fff', fontFamily: 'sans-serif',
      }}>
        <svg width="150" height="141" viewBox={LOGO_VIEWBOX}><path d={LOGO_PATH} fill="#ff4800" /></svg>
        <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, letterSpacing: -2, marginTop: 44 }}>
          Resoha Roatán
        </div>
        <div style={{ display: 'flex', fontSize: 38, opacity: 0.75, marginTop: 14 }}>
          Homes, condos and titled land on the Bay Islands
        </div>
      </div>
    ),
    size,
  );
}
