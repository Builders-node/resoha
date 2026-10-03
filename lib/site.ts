/**
 * Публічна адреса сайту — для посилань, які живуть поза ним: превʼю в месенджерах,
 * sitemap, текст повідомлення у WhatsApp. На Vercel беремо продакшен-домен проєкту,
 * тож навіть превʼю-збірка посилається на бойовий сайт, а не на тимчасовий URL.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  || 'http://localhost:3000'
).replace(/\/$/, '');

/** Куди писати з питань даних і умов. Без адреси сторінки відсилають до форми на обʼєкті. */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '';
/** Хто юридично стоїть за сайтом — підставляється в політику й умови. */
export const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR ?? 'Resoha Roatán';
export const LEGAL_UPDATED = '2 October 2026';

export const SITE_NAME = 'Resoha Roatán';

/** Шлях для редиректу після входу: лише всередині сайту, щоб ?next= не вів на чужий домен. */
export function safePath(v: string | null | undefined, fallback = '/') {
  return v && v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') ? v : fallback;
}
