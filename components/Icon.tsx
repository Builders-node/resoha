import type { SVGProps } from 'react';

/** Один набір лінійних іконок 24×24 замість емодзі. Колір — currentColor. */
const PATHS: Record<string, React.ReactNode> = {
  home: <><path d="M3.5 10.5 12 3.5l8.5 7" /><path d="M5.8 9.4V20.5h12.4V9.4" /></>,
  key: <><circle cx="7.5" cy="12" r="3.6" /><path d="M11.1 12H20" /><path d="M17.4 12v3.2" /><path d="M20 12v3.9" /></>,
  map: <><path d="M3.5 6.6 9 4.2v13.2l-5.5 2.4z" /><path d="M9 4.2l6 2.6v13.2L9 17.4z" /><path d="M15 6.8l5.5-2.6v13.2L15 20z" /></>,
  building: <><rect x="4.2" y="3.6" width="15.6" height="16.8" rx="2.2" /><path d="M8.4 8h2M8.4 12h2M8.4 16h2M13.6 8h2M13.6 12h2M13.6 16h2" /></>,
  verified: <><circle cx="12" cy="12" r="8.6" /><path d="m8.4 12.2 2.6 2.6 4.6-5.2" /></>,
  check: <><path d="m5 12.5 4.5 4.5L19 7" /></>,
  heart: <><path d="M12 20.3c-1.2-.8-8.2-5.2-8.2-9.9a4.7 4.7 0 0 1 8.2-3.1 4.7 4.7 0 0 1 8.2 3.1c0 4.7-7 9.1-8.2 9.9z" /></>,
  user: <><circle cx="12" cy="8.3" r="3.6" /><path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0" /></>,
  logout: <><path d="M14.5 4.5h3.3A1.7 1.7 0 0 1 19.5 6.2v11.6a1.7 1.7 0 0 1-1.7 1.7h-3.3" /><path d="m9.5 8.2-4 3.8 4 3.8" /><path d="M5.5 12h9" /></>,
  wave: <><path d="M2.5 9.2c2.4-2.1 4-2.1 6.4 0s4 2.1 6.4 0 4-2.1 6.2 0" /><path d="M2.5 14.8c2.4-2.1 4-2.1 6.4 0s4 2.1 6.4 0 4-2.1 6.2 0" /></>,
  sliders: <><path d="M3.5 7.5h9M16.5 7.5h4M3.5 16.5h4M11.5 16.5h9" /><circle cx="14.4" cy="7.5" r="2.3" /><circle cx="9.4" cy="16.5" r="2.3" /></>,
  list: <><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.6" cy="6.5" r="1.3" /><circle cx="4.6" cy="12" r="1.3" /><circle cx="4.6" cy="17.5" r="1.3" /></>,
  more: <><circle cx="12" cy="5.2" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="18.8" r="1.6" /></>,
  sort: <><path d="M4 6.5h13M4 12h9M4 17.5h5" /></>,
  bookmark: <><path d="M6.6 3.8h10.8v16.4L12 16.2l-5.4 4z" /></>,
  deed: <><path d="M6.4 3.5h7L18 8v12.5H6.4z" /><path d="M13.2 3.5V8h4.6" /><path d="M9 12.5h6M9 16h4" /></>,
  pin: <><path d="M12 20.8s6.8-5.6 6.8-10.6a6.8 6.8 0 1 0-13.6 0c0 5 6.8 10.6 6.8 10.6z" /><circle cx="12" cy="10" r="2.5" /></>,
  phone: <><path d="M6.4 3.6h3.1l1.6 4-2.1 1.6a12.4 12.4 0 0 0 5.8 5.8l1.6-2.1 4 1.6v3.1a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.4 5.8a2 2 0 0 1 2-2.2z" /></>,
  plus: <><path d="M12 5.2v13.6M5.2 12h13.6" /></>,
  inbox: <><rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2" /><path d="m3.9 6.6 8.1 6 8.1-6" /></>,
  bell: <><path d="M9.4 18.4a2.7 2.7 0 0 0 5.2 0" /><path d="M18.2 15.6c-1-1.1-1.6-2.1-1.6-4.6a4.6 4.6 0 1 0-9.2 0c0 2.5-.6 3.5-1.6 4.6z" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m15.6 15.6 4.4 4.4" /></>,
  close: <><path d="m6.5 6.5 11 11M17.5 6.5l-11 11" /></>,
  arrowLeft: <><path d="M19.5 12h-14" /><path d="m10.5 7-5 5 5 5" /></>,
  arrowDown: <><path d="M12 4.5v14" /><path d="m7 13.5 5 5 5-5" /></>,
  flag: <><path d="M5.5 21V4.5" /><path d="M5.5 4.5h11.2l-2.2 4 2.2 4H5.5" /></>,
  calendar: <><rect x="3.8" y="5.2" width="16.4" height="15" rx="2.2" /><path d="M3.8 9.8h16.4M8.2 3.4v3.6M15.8 3.4v3.6" /></>,
  arrowRight: <><path d="M4.5 12h14" /><path d="m13.5 7 5 5-5 5" /></>,
  star: <><path d="m12 4 2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z" /></>,
  chat: <><path d="M20.4 12.4c0 4-3.8 7.2-8.4 7.2a9.6 9.6 0 0 1-3-.5l-4.4 1.4 1.4-3.7a6.9 6.9 0 0 1-2.4-5.1c0-4 3.8-7.2 8.4-7.2s8.4 3.2 8.4 7.2z" /></>,
  island: <><path d="M2.8 18.6c1.9-1.6 3.2-1.6 5.1 0s3.2 1.6 5.1 0 3.2-1.6 5-.1" /><path d="M12 16V9.4" /><path d="M12 9.4c-2-2.2-4.4-2.4-6.2-1 1.6-2.5 4.2-2.8 6.2-1.1 2-1.7 4.6-1.4 6.2 1.1-1.8-1.4-4.2-1.2-6.2 1z" /></>,
  land: <><path d="M3.4 17.5 12 13l8.6 4.5-8.6 4z" /><path d="M12 13V6.5" /><path d="M12 6.5c1.6-1.4 3.6-1.4 5 0-1.4 1.4-3.4 1.4-5 0z" /></>,
  briefcase: <><rect x="3.4" y="7.4" width="17.2" height="11.6" rx="2" /><path d="M9 7.4V6a1.6 1.6 0 0 1 1.6-1.6h2.8A1.6 1.6 0 0 1 15 6v1.4" /><path d="M3.4 12.4h17.2" /></>,
  camera: <><path d="M3.4 8.6h3.4l1.5-2.4h7.4l1.5 2.4h3.4v10H3.4z" /><circle cx="12" cy="13.2" r="3.4" /></>,
  link: <><path d="M10.4 13.6a3.8 3.8 0 0 0 5.4 0l2.6-2.6a3.8 3.8 0 0 0-5.4-5.4l-1.3 1.3" /><path d="M13.6 10.4a3.8 3.8 0 0 0-5.4 0l-2.6 2.6a3.8 3.8 0 0 0 5.4 5.4l1.3-1.3" /></>,
  /* характеристики ЖК */
  layers: <><path d="m12 3.6 8.4 4.2L12 12 3.6 7.8z" /><path d="m3.6 12 8.4 4.2 8.4-4.2" /><path d="m3.6 16.2 8.4 4.2 8.4-4.2" /></>,
  crane: <><path d="M6.5 20.5V4.5" /><path d="M3.5 20.5h6" /><path d="M6.5 6.5h13" /><path d="M17.5 6.5v5" /><rect x="15.5" y="11.5" width="4" height="3" /><path d="M6.5 4.5 10 6.5" /></>,
  bricks: <><rect x="3.4" y="5" width="17.2" height="14" rx="1" /><path d="M3.4 9.7h17.2M3.4 14.3h17.2M9 5v4.7M15 9.7v4.6M9 14.3V19" /></>,
  shieldHome: <><path d="M3.6 11 12 4l8.4 7" /><path d="M6 9.2v11.3h12V9.2" /><path d="M9.5 20.5v-5.2h5v5.2" /></>,
  snow: <><path d="M12 3.5v17M4.6 7.7l14.8 8.6M4.6 16.3l14.8-8.6" /><path d="m9.6 4.8 2.4 2 2.4-2M9.6 19.2l2.4-2 2.4 2" /></>,
  height: <><path d="M12 3.8v16.4" /><path d="m8.6 7 3.4-3.2L15.4 7M8.6 17l3.4 3.2 3.4-3.2" /><path d="M4 3.8h4M16 3.8h4M4 20.2h4M16 20.2h4" /></>,
  grid: <><rect x="4" y="4" width="6.6" height="6.6" rx="1" /><rect x="13.4" y="4" width="6.6" height="6.6" rx="1" /><rect x="4" y="13.4" width="6.6" height="6.6" rx="1" /><rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1" /></>,
  brush: <><path d="M14.8 4.2 19.8 9.2 11 18H6v-5z" /><path d="m12.4 6.6 5 5" /></>,
  fence: <><path d="M4.4 20V6.5L6 4.5l1.6 2V20M10.4 20V6.5L12 4.5l1.6 2V20M16.4 20V6.5L18 4.5l1.6 2V20" /><path d="M3 9.5h18M3 15.5h18" /></>,
  car: <><path d="M4.4 16.6V12l1.9-5h11.4l1.9 5v4.6z" /><path d="M4.4 12h15.2" /><circle cx="7.8" cy="16.6" r="1.6" /><circle cx="16.2" cy="16.6" r="1.6" /></>,
  bolt: <><path d="M13.2 3.4 5.6 13.4h6l-1 7.2 7.8-10.2h-6z" /></>,
  drop: <><path d="M12 3.6s6.2 6.6 6.2 11a6.2 6.2 0 0 1-12.4 0c0-4.4 6.2-11 6.2-11z" /></>,
  wallet: <><rect x="3.4" y="6.2" width="17.2" height="13" rx="2" /><path d="M3.4 9.8h17.2" /><circle cx="16.4" cy="14.4" r="1.1" /></>,
  sparkle: <><path d="M12 3.8 13.8 10.2 20.2 12l-6.4 1.8L12 20.2l-1.8-6.4L3.8 12l6.4-1.8z" /></>,
  /* документи й медіа ЖК */
  play: <><circle cx="12" cy="12" r="8.6" /><path d="M10.2 8.8v6.4l5.2-3.2z" /></>,
  orbit: <><ellipse cx="12" cy="12" rx="8.6" ry="3.6" /><path d="M12 3.4a3.6 8.6 0 0 1 0 17.2" /><path d="M17.6 7.2l1.6 1.2-1.9.6" /></>,
  download: <><path d="M12 4v11M7.4 10.6 12 15.2l4.6-4.6" /><path d="M4.6 19.4h14.8" /></>,
};

type Props = SVGProps<SVGSVGElement> & { name: keyof typeof PATHS | string; size?: number };

export default function Icon({ name, size = 20, ...rest }: Props) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      className="ico"
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable="false" {...rest}
    >
      {path}
    </svg>
  );
}

/** Серце окремо: має два стани — контур і залите. */
export function HeartIcon({ filled = false, size = 20 }: { filled?: boolean; size?: number }) {
  return (
    <svg
      className="ico" width={size} height={size} viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false"
    >
      <path d="M12 20.3c-1.2-.8-8.2-5.2-8.2-9.9a4.7 4.7 0 0 1 8.2-3.1 4.7 4.7 0 0 1 8.2 3.1c0 4.7-7 9.1-8.2 9.9z" />
    </svg>
  );
}
