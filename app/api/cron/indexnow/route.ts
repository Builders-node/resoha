import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import sitemap from '@/app/sitemaps/sitemap';
import { sitemapIds } from '@/lib/sitemapData';
import { enabled, submitAbsolute } from '@/lib/indexNow';

export const maxDuration = 60;

/** Щоденний прохід дивиться на два дні назад: з запасом, щоб пропущений запуск не губив змін. */
const WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** В адресах карти сайту & уже екрановано для XML — IndexNow потрібні звичайні адреси. */
const unxml = (s: string) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/**
 * IndexNow з карти сайту (Vercel Cron, Authorization: Bearer CRON_SECRET). У карті лише сторінки,
 * відкриті для індексації, тож noindex сюди не потрапляє.
 * Щодня — сторінки з lastmod за останні два дні: нові й оновлені статті блогу та гіди (вони живуть
 * у коді й виходять з деплоєм), оголошення, змінені просто в базі чи імпортом. Окремі оголошення,
 * ЖК і забудовники ще й пінгуються самі при зміні (lib/indexNow.ts).
 * З ?all=1 — уся карта: раз на місяць і вручну кнопкою Run у Vercel → Settings → Cron Jobs.
 */
async function run(req: Request) {
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!process.env.CRON_SECRET || !bearer || !same(bearer, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  }
  if (!enabled()) return NextResponse.json({ skipped: 'not production' });

  const all = new URL(req.url).searchParams.get('all') === '1';
  const since = Date.now() - WINDOW_MS;
  const ids = await sitemapIds();
  const files = await Promise.all(ids.map((id) => sitemap({ id: Promise.resolve(id) })));
  const urls = files.flat()
    .filter((e) => all || (e.lastModified && new Date(e.lastModified).getTime() >= since))
    .map((e) => unxml(e.url));
  const submitted = await submitAbsolute(urls);
  return NextResponse.json({ mode: all ? 'all' : 'recent', files: ids.length, submitted });
}

export const GET = run;
export const POST = run;
