import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Пошук битих фото: посилання в базі, які вже не відкриваються (сайт агенції видалив файл,
 * забудовник переробив сайт, хотлінк заборонено). Перевіряємо з сервера, бо браузер адміна
 * не може запитати чужий сайт через CORS.
 *
 * Наш Storage і власні /photos/* не перевіряємо мережею — вони наші й не зникають самі.
 */

const SUPABASE_HOST = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host; } catch { return ''; } })();
const OWN_HOSTS = new Set([SUPABASE_HOST, 'www.hogarli.com', 'hogarli.com'].filter(Boolean));

/** Де в базі живе посилання: таблиця, рядок і людська назва для звіту. */
export type PhotoRef = { table: 'listings' | 'developments' | 'development_progress' | 'development_news' | 'buildings' | 'developers'; id: string; label: string };

export type CheckResult = {
  url: string;
  /** dead — точно не відкривається (4xx, не картинка, домену нема); flaky — сервер не відповів, варто перевірити пізніше */
  status: 'dead' | 'flaky';
  reason: string;
  refs: PhotoRef[];
};

const external = (url: unknown): url is string => {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return false;
  try { return !OWN_HOSTS.has(new URL(url).host); } catch { return false; }
};

/** Усі чужі посилання на фото по всіх таблицях: url → де воно використане. */
export async function collectExternalPhotos(client: SupabaseClient) {
  const map = new Map<string, PhotoRef[]>();
  const add = (url: unknown, ref: PhotoRef) => {
    if (!external(url)) return;
    const refs = map.get(url) ?? [];
    refs.push(ref);
    map.set(url, refs);
  };
  const [listings, developments, progress, news, buildings, developers] = await Promise.all([
    client.from('listings').select('id, title, photos').limit(5000),
    client.from('developments').select('id, name, photos').limit(2000),
    client.from('development_progress').select('id, photos').limit(5000),
    client.from('development_news').select('id, photo').limit(5000),
    client.from('buildings').select('id, photo').limit(5000),
    client.from('developers').select('id, name, logo').limit(2000),
  ]);
  for (const r of listings.data ?? []) for (const u of r.photos ?? []) add(u, { table: 'listings', id: r.id, label: r.title });
  for (const r of developments.data ?? []) for (const u of r.photos ?? []) add(u, { table: 'developments', id: r.id, label: r.name });
  for (const r of progress.data ?? []) for (const u of r.photos ?? []) add(u, { table: 'development_progress', id: r.id, label: 'Construction update' });
  for (const r of news.data ?? []) add(r.photo, { table: 'development_news', id: r.id, label: 'News' });
  for (const r of buildings.data ?? []) add(r.photo, { table: 'buildings', id: r.id, label: 'Building' });
  for (const r of developers.data ?? []) add(r.logo, { table: 'developers', id: r.id, label: `${r.name} (logo)` });
  // стабільний порядок — щоб порції offset/limit не перескакували між викликами
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

const UA = 'Mozilla/5.0 (compatible; HogarliBot/1.0; +https://www.hogarli.com)';

/** Одне посилання: null — фото на місці. Запитуємо лише перші байти, щоб не тягнути мегабайти. */
export async function probe(url: string): Promise<{ status: 'dead' | 'flaky'; reason: string } | null> {
  let lastErr = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Range: 'bytes=0-1023', Accept: 'image/avif,image/webp,image/*,*/*;q=0.8', Referer: 'https://www.hogarli.com/' },
        redirect: 'follow',
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      });
      const type = res.headers.get('content-type') ?? '';
      await res.body?.cancel().catch(() => {});
      if (res.ok) return /^image\//i.test(type) ? null : { status: 'dead', reason: `not an image (${type || 'no type'})` };
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return { status: 'dead', reason: `HTTP ${res.status}` };
      lastErr = `HTTP ${res.status}`;
    } catch (e) {
      const code = (e as { cause?: { code?: string } }).cause?.code ?? '';
      // домену більше нема — це не тимчасово
      if (code === 'ENOTFOUND') return { status: 'dead', reason: 'domain not found' };
      lastErr = code || ((e as Error).name === 'TimeoutError' ? 'timeout' : (e as Error).message);
    }
  }
  return { status: 'flaky', reason: lastErr || 'no response' };
}

/** Порція перевірки: `limit` посилань від `offset`, по 8 паралельно. */
export async function checkBatch(client: SupabaseClient, offset: number, limit = 60) {
  const all = await collectExternalPhotos(client);
  const slice = all.slice(offset, offset + limit);
  const bad: CheckResult[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < slice.length) {
      const [url, refs] = slice[i++];
      const r = await probe(url);
      if (r) bad.push({ url, refs, ...r });
    }
  }));
  const next = offset + slice.length;
  return { total: all.length, next: next < all.length ? next : null, bad };
}

/**
 * Прибрати биті посилання з бази: з масивів фото — викидаємо, одиночне фото/логотип — обнуляємо
 * (тоді сайт покаже заглушку або ініціали). Повертає, скільки рядків змінено.
 */
export async function pruneDead(client: SupabaseClient, urls: string[]) {
  const dead = new Set(urls.filter(external));
  if (!dead.size) return { rows: 0 };
  const all = await collectExternalPhotos(client);
  const touched = new Map<string, Set<string>>(); // table → ids
  for (const [url, refs] of all) {
    if (!dead.has(url)) continue;
    for (const r of refs) {
      const ids = touched.get(r.table) ?? new Set<string>();
      ids.add(r.id);
      touched.set(r.table, ids);
    }
  }
  let rows = 0;
  for (const [table, ids] of touched) {
    for (const id of ids) {
      if (table === 'listings') {
        const { data } = await client.from('listings').select('photos, photo_rooms').eq('id', id).single();
        if (!data) continue;
        const rooms = { ...((data.photo_rooms ?? {}) as Record<string, string>) };
        for (const u of dead) delete rooms[u];
        const { error } = await client.from('listings')
          .update({ photos: (data.photos ?? []).filter((u: string) => !dead.has(u)), photo_rooms: rooms }).eq('id', id);
        if (error) throw error;
      } else if (table === 'developments' || table === 'development_progress') {
        const { data } = await client.from(table).select('photos').eq('id', id).single();
        if (!data) continue;
        const { error } = await client.from(table).update({ photos: (data.photos ?? []).filter((u: string) => !dead.has(u)) }).eq('id', id);
        if (error) throw error;
      } else {
        const col = table === 'developers' ? 'logo' : 'photo';
        const { error } = await client.from(table).update({ [col]: '' }).eq('id', id);
        if (error) throw error;
      }
      rows++;
    }
  }
  return { rows };
}
