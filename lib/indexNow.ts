import { after } from 'next/server';
import { SITE_URL } from './site';
import { langAlternates } from './i18n/paths';
import { cloneMap } from './clones';
import { supabaseAnon } from './supabase/anon';

/**
 * IndexNow: щойно оголошення, ЖК чи забудовника опублікували, змінили чи зняли, кажемо про це
 * Bing, Yandex, Seznam і Naver — без очікування, поки вони самі перечитають sitemap. Bing годує й пошук
 * ChatGPT, Copilot і DuckDuckGo. Google протоколу не підтримує, йому лишається sitemap з lastmod.
 * Статті блогу, гіди й усе, що змінили повз сайт (SQL, імпорт), підбирає щоденний
 * app/api/cron/indexnow з карти сайту.
 *
 * Ключ не секретний: він лише доводить, що домен наш, і лежить файлом у public/.
 */
export const INDEXNOW_KEY = '3ee2b7851aa849fa942cbb9e57a43ebf';

/** Пінгуємо лише з бойового сайту: превʼю й локальні збірки мають чужі адреси. */
export const enabled = () => process.env.VERCEL_ENV === 'production' && SITE_URL.startsWith('https://');

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
  // успіх теж пишемо в лог: у Vercel → Logs видно, що пінги справді йдуть
  console.info(`IndexNow: ${res.status}, ${urlList.length} URL`);
}

const LISTING = /^\/listings\/([0-9a-f-]{36})$/;

/**
 * Черга адрес на відправку. Прайс-лист ЖК чи імпорт оновлює десятки оголошень за один запит —
 * збираємо їх і шлемо одним заходом після відповіді, а не запитом на кожне.
 */
const queue = new Set<string>();
let scheduled = false;

async function flush() {
  scheduled = false;
  const paths = [...queue];
  queue.clear();
  // копії квартир ЖК постійно перенаправляють на головне оголошення (lib/clones.ts) — їх не шлемо
  const clones = paths.some((p) => LISTING.test(p))
    ? await (async () => cloneMap(supabaseAnon()))().catch(() => new Map<string, string>())
    : new Map<string, string>();
  const keep = paths.filter((p) => !clones.has(LISTING.exec(p)?.[1] ?? ''));
  try { await submitUrls(keep); } catch (e) { console.error('IndexNow failed:', (e as Error).message); }
}

/** Сторінки сайту (англійські шляхи; /es додається сам) — після відповіді, щоб не тримати збереження форми. */
export function pingPaths(paths: (string | null | undefined)[]) {
  if (!enabled()) return;
  const add = paths.filter((p): p is string => Boolean(p));
  if (!add.length) return;
  for (const p of add) queue.add(p);
  if (scheduled) return;
  try {
    after(flush);
    scheduled = true;
  } catch {
    // поза запитом after() недоступний — пошуковик дізнається з карти сайту
    queue.clear();
  }
}

/** Сторінки оголошень (обидві мови). */
export function pingListings(ids: (string | null | undefined)[]) {
  pingPaths(ids.filter(Boolean).map((id) => `/listings/${id}`));
}

/** Сторінка ЖК і список ЖК, де він показаний. */
export function pingDevelopment(slug: string | null | undefined) {
  if (slug) pingPaths([`/developments/${slug}`, '/developments']);
}

/** Сторінка забудовника і список забудовників. */
export function pingDeveloper(slug: string | null | undefined) {
  if (slug) pingPaths([`/developers/${slug}`, '/developers']);
}
