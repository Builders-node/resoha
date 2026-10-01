import { LOGO_PATH, LOGO_VIEWBOX } from '@/lib/logo';

/**
 * Знак Resoha: помаранчева пляма з вирізаною шестикутною зіркою. Той самий
 * файл лежить в app/icon.svg як фавікон; тут — інлайном, щоб масштабувати
 * й фарбувати через брендовий токен без зайвого запиту.
 */
export default function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      className={`logo-mark ${className}`.trim()}
      width={size} height={Math.round(size * 621 / 661)} viewBox={LOGO_VIEWBOX}
      fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
    >
      <path
        fill="currentColor"
        d={LOGO_PATH}
      />
    </svg>
  );
}
