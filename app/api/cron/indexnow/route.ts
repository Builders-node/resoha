import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import sitemap, { generateSitemaps } from '@/app/sitemaps/sitemap';
import { enabled, submitAbsolute } from '@/lib/indexNow';

export const maxDuration = 60;

/** Скільки назад дивимось у щоденному проході: з запасом, щоб пропущений запуск не губив зміни. */
const WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** У карті сайту адреси вже екрановані для XML — IndexNow потрібні звичайні. */
const unxml = (s: string) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

/**
 * IndexNow з карти сайту (Vercel Cron, Authorization: Bearer CRON_SECRET). Щодня — сторінки з lastmod
 * за останні два дні: так Bing дізнається і про зміни, внесені просто в базу чи кодом (нові статті,
 * імпорт оголошень SQL-ом), повз pingListings. З ?all=1 — уся карта: раз на місяць і вручну
 * кнопкою Run у Vercel → Settings → Cron Jobs, щоб одразу після підключення Bing отримав усі сторінки.
 */
async function run(req: Request) {
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!(process.env.CRON_SECRET && bearer && same(bearer, process.env.CRON_SECRET))) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  }
  if (!enabled()) return NextResponse.json({ skipped: 'not production' });

  const all = new URL(req.url).searchParams.get('all') === '1';
  const since = Date.now() - WINDOW_MS;
  const ids = await generateSitemaps();
  const files = await Promise.all(ids.map(({ id }) => sitemap({ id: Promise.resolve(id) })));
  const urls = files.flat()
    .filter((e) => all || (e.lastModified && new Date(e.lastModified).getTime() >= since))
    .map((e) => unxml(e.url));

  if (process.env.DRY) return NextResponse.json({ n: urls.length, sample: urls.filter((_, i) => i % 400 === 0) });
  if (process.env.DRY) return NextResponse.json({ n: urls.length, sample: urls.filter((_, i) => i % 400 === 0) });
  const submitted = await submitAbsolute(urls);
  return NextResponse.json({ mode: all ? 'all' : 'recent', submitted });
}

export const GET = run;
