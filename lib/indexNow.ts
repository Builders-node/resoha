import { after } from 'next/server';
import { SITE_URL } from './site';
import { langAlternates } from './i18n/paths';

/**
 * IndexNow: щойно оголошення опублікували, змінили чи зняли, кажемо про це Bing, Yandex,
 * Seznam і Naver — без очікування, поки вони самі перечитають sitemap. Bing годує й пошук
 * ChatGPT, Copilot і DuckDuckGo. Google протоколу не підтримує, йому лишається sitemap з lastmod.
 *
 * Ключ не секретний: він лише доводить, що домен наш, і лежить файлом у public/.
 */
export const INDEXNOW_KEY = 'e818fc25acd8b0877803576258cce94d';

/** Пінгуємо лише з бойового сайту: превʼю й локальні збірки мають чужі адреси. */
const enabled = () => process.env.VERCEL_ENV === 'production' && SITE_URL.startsWith('https://');

export async function submitUrls(paths: string[]) {
  const urlList = [...new Set(paths.flatMap((p) => Object.values(langAlternates(p))))].map((p) => `${SITE_URL}${p}`);
  if (!urlList.length) return;
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok && res.status !== 202) console.error('IndexNow:', res.status, await res.text().catch(() => ''));
}

/** Сторінки оголошень (обидві мови) — після відповіді, щоб не тримати збереження форми. */
export function pingListings(ids: (string | null | undefined)[]) {
  const paths = ids.filter((id): id is string => Boolean(id)).map((id) => `/listings/${id}`);
  if (!paths.length || !enabled()) return;
  try {
    after(async () => {
      try { await submitUrls(paths); } catch (e) { console.error('IndexNow failed:', (e as Error).message); }
    });
  } catch {
    // поза запитом after() недоступний — пошуковик дізнається з карти сайту
  }
}
