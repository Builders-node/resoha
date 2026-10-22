import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import sitemap from '@/app/sitemaps/sitemap';
import { sitemapIds } from '@/lib/sitemapData';
import { submitAbsolute } from '@/lib/indexNow';

export const maxDuration = 60;

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** В адресах карти сайту & уже екрановано для XML — IndexNow потрібні звичайні адреси. */
const unxml = (s: string) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/**
 * Усі адреси з карти сайту (обидві мови) — в IndexNow одним заходом. Окремі оголошення
 * пінгуються самі при зміні (lib/indexNow.ts), а це — повна звірка: раз на місяць з Vercel Cron
 * (Authorization: Bearer CRON_SECRET) і вручну кнопкою Run у Vercel → Settings → Cron Jobs.
 */
async function run(req: Request) {
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!process.env.CRON_SECRET || !bearer || !same(bearer, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  }
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.json({ skipped: 'not production' });

  const ids = await sitemapIds();
  const files = await Promise.all(ids.map((id) => sitemap({ id: Promise.resolve(id) })));
  const urls = files.flat().map((e) => unxml(e.url));
  const submitted = await submitAbsolute(urls);
  return NextResponse.json({ files: ids.length, submitted });
}

export const GET = run;
export const POST = run;
