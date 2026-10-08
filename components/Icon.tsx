import type { SVGProps } from 'react';

/** Один набір лінійних іконок 24×24 замість емодзі. Колір — currentColor. */
const PATHS: Record<string, React.ReactNode> = {
  home: <><path d="M3.5 10.5 12 3.5l8.5 7" /><path d="M5.8 9.4V20.5h12.4V9.4" /></>,
  key: <><circle cx="7.5" cy="12" r="3.6" /><path d="M11.1 12H20" /><path d="M17.4 12v3.2" /><path d="M20 12v3.9" /></>,
  map: <><path d="M3.5 6.6 9 4.2v13.2l-5.5 2.4z" /><path d="M9 4.2l6 2.6v13.2L9 17.4z" /><path d="M15 6.8l5.5-2.6v13.2L15 20z" /></>,
  building: <><rect x="4.2" y="3.6" width="15.6" height="16.8" rx="2.2" /><path d="M8.4 8h2M8.4 12h2M8.4 16h2M13.6 8h2M13.6 12h2M13.6 16h2" /></>,
  verified: <><circle cx="12" cy="12" r="8.6" /><path d="m8.4 12.2 2.6 2.6 4.6-5.2" /></>,
  chart: <><path d="M4 4.5v15.5h16" /><path d="m7.5 15 3.6-4.4 3.2 2.6 5-6.4" /></>,
  check: <><path d="m5 12.5 4.5 4.5L19 7" /></>,
  heart: <><path d="M12 20.3c-1.2-.8-8.2-5.2-8.2-9.9a4.7 4.7 0 0 1 8.2-3.1 4.7 4.7 0 0 1 8.2 3.1c0 4.7-7 9.1-8.2 9.9z" /></>,
  user: <><circle cx="12" cy="8.3" r="3.6" /><path d="M4.8 20.4a7.2 7.2 0 0 1 14.4 0" /></>,
  users: <><circle cx="9.2" cy="8.6" r="3.2" /><path d="M3.4 19.6a5.8 5.8 0 0 1 11.6 0" /><path d="M15.2 5.6a3.2 3.2 0 0 1 0 6.1" /><path d="M17.6 14.2a5.8 5.8 0 0 1 3 5.4" /></>,
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
  arrowUp: <><path d="M12 19.5v-14" /><path d="m7 10.5 5-5 5 5" /></>,
  arrowDown: <><path d="M12 4.5v14" /><path d="m7 13.5 5 5 5-5" /></>,
  flag: <><path d="M5.5 21V4.5" /><path d="M5.5 4.5h11.2l-2.2 4 2.2 4H5.5" /></>,
  headset: <><path d="M4.6 14.2v-2.4a7.4 7.4 0 0 1 14.8 0v2.4" /><rect x="3.6" y="12.6" width="3.6" height="5.4" rx="1.4" /><rect x="16.8" y="12.6" width="3.6" height="5.4" rx="1.4" /><path d="M18.6 18v.6a2.4 2.4 0 0 1-2.4 2.4H13" /></>,
  clock: <><circle cx="12" cy="12" r="8.6" /><path d="M12 7.4V12l3.2 2" /></>,
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
  pencil: <><path d="M15.2 4.6a2 2 0 0 1 2.8 0l1.4 1.4a2 2 0 0 1 0 2.8L9 19.2l-4.6 1 1-4.6z" /><path d="m13.6 6.2 4.2 4.2" /></>,
  trash: <><path d="M4.5 6.8h15" /><path d="M9.4 6.8V4.9a1.1 1.1 0 0 1 1.1-1.1h3a1.1 1.1 0 0 1 1.1 1.1v1.9" /><path d="M6.4 6.8l.9 12.4a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.9-12.4" /><path d="M10.2 10.8v6M13.8 10.8v6" /></>,
  chevron: <><path d="m9.5 6 6 6-6 6" /></>,
  download: <><path d="M12 4v11M7.4 10.6 12 15.2l4.6-4.6" /><path d="M4.6 19.4h14.8" /></>,
  /* сторінка обʼєкта: «Details» і «In the apartment», як у LUN */
  bed: <><path d="M3.5 18.5v-12" /><path d="M3.5 14.2h17v4.3" /><path d="M20.5 14.2v-2.4a2.4 2.4 0 0 0-2.4-2.4H11v4.8" /><circle cx="7.2" cy="11" r="1.8" /></>,
  bath: <><path d="M3.5 12h17v2.4a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4z" /><path d="M6 12V6.4a2 2 0 0 1 3.6-1.2" /><path d="m7 18.4-1 2M17 18.4l1 2" /></>,
  shower: <><path d="M4.5 20.5V7.6a3.6 3.6 0 0 1 7.2 0v.9" /><path d="M8.6 8.5h6.2" /><path d="M9.6 12v1.4M11.7 12v2.6M13.8 12v1.4M10.6 16.6v1M12.8 16.6v1" /></>,
  area: <><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></>,
  stairs: <><path d="M3.5 19.5H8V15h4.5v-4.5H17V6h3.5" /></>,
  sofa: <><path d="M5 11V8a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 8v3" /><path d="M3.5 13a1.75 1.75 0 0 1 3.5 0v2h10v-2a1.75 1.75 0 0 1 3.5 0v5h-17z" /><path d="M5.5 18v2M18.5 18v2" /></>,
  balcony: <><path d="M4 11.5h16M4 20.5h16M6 11.5v9M10 11.5v9M14 11.5v9M18 11.5v9" /><path d="M7 11.5v-7h10v7" /></>,
  paw: <><circle cx="6.8" cy="10.2" r="1.7" /><circle cx="10.4" cy="6.4" r="1.7" /><circle cx="13.6" cy="6.4" r="1.7" /><circle cx="17.2" cy="10.2" r="1.7" /><path d="M12 11.6c-2.6 0-5 3.3-5 5.4 0 1.6 1.3 2.6 2.7 2.6 1 0 1.6-.5 2.3-.5s1.3.5 2.3.5c1.4 0 2.7-1 2.7-2.6 0-2.1-2.4-5.4-5-5.4z" /></>,
  eye: <><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  kitchen: <><path d="M7 3.5v17M4.6 3.5v5a2.4 2.4 0 0 0 4.8 0v-5" /><path d="M16.8 20.5v-17c-2 1-3.2 3.6-3.2 7.2h3.2" /></>,
  stove: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><circle cx="9" cy="8" r="1.8" /><circle cx="15" cy="8" r="1.8" /><path d="M4 12h16M8.5 15.6h7" /></>,
  fridge: <><rect x="6" y="3.5" width="12" height="17" rx="2" /><path d="M6 10h12M9 6.4v1.4M9 12.6v3" /></>,
  microwave: <><rect x="3" y="5.5" width="18" height="13" rx="1.8" /><rect x="5.6" y="8.1" width="9" height="7.8" rx="1" /><path d="M17.6 9v.01M17.6 12v.01M17.6 15v.01" /></>,
  dishwasher: <><rect x="4.5" y="3.5" width="15" height="17" rx="2" /><path d="M4.5 8h15M8 5.8h.01M11 5.8h.01" /><path d="m8.4 12.4 1.4 1.4M13.6 15.6l2 2M14.2 11.6l1 1" /></>,
  washer: <><rect x="4.5" y="3.5" width="15" height="17" rx="2" /><circle cx="12" cy="13.2" r="4" /><path d="M7.6 6.6h1.6M11.4 6.6h.01" /></>,
  fan: <><circle cx="12" cy="12" r="1.6" /><path d="M12 10.4c-1-3.4.5-6.4 3-5.8 2 .5 1.3 3.6-3 5.8zM13.6 12.4c3.4-.6 6 1.4 5.1 3.7-.7 1.9-3.7.9-5.1-3.7zM10.6 12.8c-2.6 2.3-5.9 2.3-6.3-.2-.3-2 2.8-2.6 6.3.2z" /></>,
  heater: <><rect x="7" y="3.5" width="10" height="14" rx="5" /><path d="M10 17.5v3M14 17.5v3" /><path d="M12 8.4c-1.2 1.4-1.8 2.4-1.8 3.4a1.8 1.8 0 0 0 3.6 0c0-1-.6-2-1.8-3.4z" /></>,
  tv: <><rect x="3" y="5" width="18" height="12" rx="1.8" /><path d="M8.5 20.5h7" /></>,
  wifi: <><path d="M3.5 9.6a12 12 0 0 1 17 0M6.5 12.8a7.6 7.6 0 0 1 11 0M9.5 16a3.2 3.2 0 0 1 5 0" /><path d="M12 19.2v.01" /></>,
  safe: <><rect x="4" y="4" width="16" height="15" rx="2" /><circle cx="12" cy="11.5" r="3" /><path d="M12 8.5v1M7 19v1.5M17 19v1.5" /></>,
  door: <><path d="M5.5 20.5h13" /><path d="M7 20.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16" /><path d="M14 12.4v.01" /></>,
  elevator: <><rect x="4.5" y="3.5" width="15" height="17" rx="2" /><path d="M12 3.5v17" /><path d="m7 10 1.5-2 1.5 2M14 14l1.5 2 1.5-2" /></>,
  shield: <><path d="M12 3.5 5 6.2v5.3c0 4.4 3 7.8 7 9 4-1.2 7-4.6 7-9V6.2z" /><path d="m9 12 2.2 2.2 4-4.2" /></>,
  sun: <><circle cx="12" cy="12" r="3.8" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></>,
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
