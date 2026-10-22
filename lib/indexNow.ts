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
export const INDEXNOW_KEY = '3ee2b7851aa849fa942cbb9e57a43ebf';

/** Пінгуємо лише з бойового сайту: превʼю й локальні збірки мають чужі адреси. */
const enabled = () => process.env.VERCEL_ENV === 'production' && SITE_URL.startsWith('https://');

export async function submitUrls(paths: string[]) {
  const urlList = [...new Set(paths.flatMap((p) => Object.values(langAlternates(p))))].map((p) => `${SITE_URL}${p}`);
  if (!urlList.length) return;
  await post(urlList);
}

/** Протокол бере до 10 000 адрес за запит. */
const MAX_PER_REQUEST = 10_000;

/** Повні адреси як є (скажімо, всі з карти сайту) — пачками по 10 000. Повертає, скільки відправлено. */
export async function submitAbsolute(urls: string[]): Promise<number> {
  const list = [...new Set(urls.filter((u) => u.startsWith(`${SITE_URL}/`) || u === SITE_URL))];
  for (let i = 0; i < list.length; i += MAX_PER_REQUEST) await post(list.slice(i, i + MAX_PER_REQUEST));
  return list.length;
}

async function post(urlList: string[]) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE_URL).host,
      key: INDEXNOW_KEY,
      keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok && res.status !== 202) throw new Error(`IndexNow: ${res.status} ${await res.text().catch(() => '')}`);
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
