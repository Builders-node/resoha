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

export const SITE_NAME = 'Resoha Roatán';

/** Шлях для редиректу після входу: лише всередині сайту, щоб ?next= не вів на чужий домен. */
export function safePath(v: string | null | undefined, fallback = '/') {
  return v && v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') ? v : fallback;
}
