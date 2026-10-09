import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { notifySecret, processOutbox, runSavedSearchAlerts } from '@/lib/notify';
import { supabaseAnon } from '@/lib/supabase/anon';

export const maxDuration = 60;

/** Порівняння без витоку довжини збігу через час відповіді */
function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Прохід черги сповіщень. Кличуть двоє: pg_cron у базі кожні 5 хвилин (заголовок x-notify-secret,
 * див. notify_tick у 0050) і щоденний Vercel Cron (Authorization: Bearer CRON_SECRET) — підстраховка.
 */
async function run(req: Request) {
  const secret = notifySecret();
  const header = req.headers.get('x-notify-secret') ?? '';
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const ok = (secret && header && same(header, secret))
    || (process.env.CRON_SECRET && bearer && same(bearer, process.env.CRON_SECRET));
  if (!ok) return NextResponse.json({ error: 'Not allowed' }, { status: 401 });

  const client = supabaseAnon();
  const alerts = await runSavedSearchAlerts(client);
  const result = await processOutbox(client);
  return NextResponse.json({ alerts, ...result });
}

export const GET = run;
export const POST = run;
