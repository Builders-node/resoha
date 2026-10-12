import type { MetadataRoute } from 'next';
import { supabaseServer } from './supabase/server';
import { SITE_URL } from './site';
import { langAlternates } from './i18n/paths';

/**
 * Дані для карти сайту. Окремі легкі запити замість queryListings: тут потрібні лише id,
 * дата й фото, зате всі рядки (PostgREST віддає не більше 1000 за раз — йдемо сторінками).
 */
export const LISTINGS_PER_SITEMAP = 1000;
const BATCH = 1000;

type Entry = MetadataRoute.Sitemap[number];
type Freq = Entry['changeFrequency'];

/** У Next адреси в XML не екрануються — & у запиті чи в адресі фото зламав би файл. */
const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const abs = (path: string) => xml(path.startsWith('http') ? path : `${SITE_URL}${path}`);

/**
 * Обидві мовні версії сторінки: англійська й /es, кожна з повним набором hreflang.
 * path — англійська адреса.
 */
export function both(path: string, opts: { lastModified?: string | Date; changeFrequency?: Freq; priority?: number; images?: string[] } = {}): Entry[] {
  const langs = langAlternates(path);
  const languages = Object.fromEntries(Object.entries(langs).map(([k, v]) => [k, abs(v)]));
  const base = {
    ...(opts.lastModified ? { lastModified: opts.lastModified } : {}),
    ...(opts.changeFrequency ? { changeFrequency: opts.changeFrequency } : {}),
    ...(opts.priority !== undefined ? { priority: opts.priority } : {}),
    ...(opts.images?.length ? { images: opts.images.map(abs) } : {}),
    alternates: { languages },
  };
  return [
    { url: abs(langs.en), ...base },
    { url: abs(langs.es), ...base },
  ];
}

/** Фото, які можна віддати в image sitemap: повні адреси або файли з public/. */
export const sitemapImages = (photos: unknown, max = 10) =>
  (Array.isArray(photos) ? photos : [])
    .filter((p): p is string => typeof p === 'string' && (p.startsWith('http') || (p.startsWith('/') && !p.startsWith('//'))))
    .slice(0, max);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const publicListings = (sel: any) => sel.eq('active', true)
  // продані й здані окремі оголошення не індексуються; квартири ЖК лишаються зі своїм станом
  .or('status.in.(available,reserved),development_id.not.is.null');

/** Скільки оголошень іде в карту сайту. До міграції зі status рахуємо всі активні. */
export async function countSitemapListings(): Promise<number> {
  const db = await supabaseServer();
  let { count, error } = await publicListings(db.from('listings').select('id', { count: 'exact', head: true }));
  if (error) ({ count, error } = await db.from('listings').select('id', { count: 'exact', head: true }).eq('active', true));
  return error ? 0 : count ?? 0;
}

export type SitemapListing = { id: string; updatedAt: string; photos: string[] };

/** Оголошення одного файлу карти: chunk-та тисяча за датою створення. */
export async function sitemapListings(chunk: number): Promise<SitemapListing[]> {
  const db = await supabaseServer();
  const from = chunk * LISTINGS_PER_SITEMAP;
  const out: SitemapListing[] = [];
  for (let off = from; off < from + LISTINGS_PER_SITEMAP; off += BATCH) {
    const run = (cols: string, filtered: boolean) => {
      const sel = db.from('listings').select(cols);
      return (filtered ? publicListings(sel) : sel.eq('active', true))
        .order('created_at', { ascending: true }).order('id', { ascending: true })
        .range(off, Math.min(off + BATCH, from + LISTINGS_PER_SITEMAP) - 1);
    };
    // updated_at і status — з пізніших міграцій; без них беремо, що є
    let { data, error } = await run('id, created_at, updated_at, photos', true);
    if (error) ({ data, error } = await run('id, created_at, photos', false));
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []) as any[];
    out.push(...rows.map((r) => ({ id: r.id, updatedAt: r.updated_at ?? r.created_at, photos: sitemapImages(r.photos) })));
    if (rows.length < BATCH) break;
  }
  return out;
}

export type SitemapDevelopment = { slug: string; createdAt: string; photos: string[] };

/** Усі активні ЖК (без обмеження в 200, як у каталозі). */
export async function sitemapDevelopments(): Promise<SitemapDevelopment[]> {
  const db = await supabaseServer();
  const out: SitemapDevelopment[] = [];
  for (let off = 0; ; off += BATCH) {
    const { data, error } = await db.from('developments').select('slug, created_at, photos')
      .eq('active', true).order('created_at', { ascending: true }).range(off, off + BATCH - 1);
    if (error) throw error;
    out.push(...(data ?? []).map((r) => ({ slug: r.slug as string, createdAt: r.created_at as string, photos: sitemapImages(r.photos) })));
    if ((data ?? []).length < BATCH) break;
  }
  return out;
}

/** Імена файлів карти: сторінки, ЖК, люди й агенції, оголошення частинами по тисячі. */
export async function sitemapIds(): Promise<string[]> {
  const listings = await countSitemapListings().catch(() => 0);
  const chunks = Math.max(1, Math.ceil(listings / LISTINGS_PER_SITEMAP));
  return ['pages', 'developments', 'people', ...Array.from({ length: chunks }, (_, i) => `listings-${i}`)];
}
