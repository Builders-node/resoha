import { LOGO_PATHS, LOGO_RATIO, LOGO_TONES, LOGO_VIEWBOX, type LogoTone } from '@/lib/logo';

/**
 * Знак Hogarli: ізометричний будинок. Той самий контур лежить в app/icon.svg як фавікон;
 * тут — інлайном, без зайвого запиту. size — висота знака; tone — набір відтінків граней:
 * orange на світлому тлі, light на темному (сайдбар, темні підвали й картки).
 */
export default function Logo({ size = 40, tone = 'orange', className = '' }: { size?: number; tone?: LogoTone; className?: string }) {
  const fills = LOGO_TONES[tone];
  return (
    <svg
      className={`logo-mark ${className}`.trim()}
      width={Math.round(size * LOGO_RATIO)} height={size} viewBox={LOGO_VIEWBOX}
      fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
    >
      {LOGO_PATHS.map((d, i) => <path key={i} fill={fills[i]} d={d} />)}
    </svg>
  );
}
