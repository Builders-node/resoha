import { ImageResponse } from 'next/og';
import Logo from '@/components/Logo';

export const alt = 'Hogarli — property in Roatán, San Pedro Sula and Tegucigalpa';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Картка за замовчуванням для всіх сторінок, де немає власної. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 80, background: '#121212', color: '#fff', fontFamily: 'sans-serif',
      }}>
        <Logo size={150} />
        <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, letterSpacing: -2, marginTop: 44 }}>
          Hogarli
        </div>
        <div style={{ display: 'flex', fontSize: 38, opacity: 0.75, marginTop: 14 }}>
          Homes, condos and land in Roatán, San Pedro Sula and Tegucigalpa
        </div>
      </div>
    ),
    size,
  );
}
