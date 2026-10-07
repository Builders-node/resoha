import { createHash } from 'node:crypto';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { supabaseServer } from './supabase/server';

/**
 * Події для аналітики кабінету (міграція 0043). Пише функція track_event у базі:
 * вона ж відкидає повтори того самого відвідувача за 30 хвилин.
 */

export type EventKind = 'view' | 'dev_view' | 'phone' | 'whatsapp' | 'viber' | 'telegram' | 'share' | 'favorite' | 'form_open';
export type Source = 'direct' | 'internal' | 'search' | 'social' | 'messenger' | 'other';

/** Події, які дозволено надсилати з браузера через /api/track */
export const CLIENT_KINDS: EventKind[] = ['phone', 'whatsapp', 'viber', 'telegram', 'share', 'form_open'];

// прев'ю посилань у месенджерах і пошукові боти — не люди
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|viber|skype|lighthouse|headless|curl|wget|python|axios|node-fetch|vercel/i;

const SEARCH = /google|bing|yahoo|duckduckgo|yandex|ecosia|baidu|brave/i;
const SOCIAL = /facebook|fb\.|instagram|t\.co$|twitter|x\.com|linkedin|tiktok|youtube|pinterest|reddit|threads/i;
const MESSENGER = /whatsapp|wa\.me|t\.me|telegram|viber|messenger|signal/i;

function classify(hint: string): Source | null {
  if (MESSENGER.test(hint)) return 'messenger';
  if (SEARCH.test(hint)) return 'search';
  if (SOCIAL.test(hint)) return 'social';
  return null;
}

/** Звідки прийшли: utm_source важливіший за referer, бо месенджери referer не передають. */
export function sourceOf(referer: string | null, host: string | null, utm?: string | null): Source {
  if (utm) return classify(utm) ?? 'other';
  if (!referer) return 'direct';
  let ref: URL;
  try { ref = new URL(referer); } catch { return 'other'; }
  if (host && ref.host === host) return 'internal';
  if (/resoha/i.test(ref.host)) return 'internal';
  return classify(ref.host) ?? 'other';
}

export const deviceOf = (ua: string) => (/mobi|android|iphone|ipad|ipod/i.test(ua) ? 'mobile' : 'desktop');

/** Відвідувач = хеш адреси + браузера + дня: унікальних рахуємо, людей не стежимо. */
function visitorOf(h: Headers): string {
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || '';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}|${h.get('user-agent') ?? ''}|${day}`).digest('hex').slice(0, 32);
}

type Target = { listingId?: string | null; developmentId?: string | null };

/**
 * Записати подію поза критичним шляхом рендера. Клієнт і заголовки беремо ДО after():
 * усередині колбека cookies()/headers() заборонені (див. bumpViewsAfterResponse).
 */
export async function trackAfterResponse(target: Target, kind: EventKind, opts: { utm?: string | null; h?: Headers } = {}) {
  const h = opts.h ?? await headers();
  const ua = h.get('user-agent') ?? '';
  if (!ua || BOT.test(ua)) return;
  // префетч Next.js — не перегляд
  if (h.get('next-router-prefetch') || h.get('purpose') === 'prefetch') return;

  const client = await supabaseServer();
  const row = {
    p_listing: target.listingId ?? null,
    p_development: target.developmentId ?? null,
    p_kind: kind,
    p_source: kind === 'view' || kind === 'dev_view' ? sourceOf(h.get('referer'), h.get('host'), opts.utm) : 'internal',
    p_device: deviceOf(ua),
    p_visitor: visitorOf(h),
  };
  after(async () => {
    const { error } = await client.rpc('track_event', row);
    if (!error) return;
    // база ще без міграції 0043 — хоча б старий лічильник переглядів не має зупинитись
    if (kind === 'view' && row.p_listing) await client.rpc('bump_views', { p_listing: row.p_listing });
    console.error('track_event failed:', error.message);
  });
}
