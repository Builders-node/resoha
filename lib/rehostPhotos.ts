import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Перенос фото в наш Storage: чужі сервери (імпорт з сайтів агенцій) і AVIF, який ламає превʼю
 * в месенджерах. Обкладинку (перше фото) пишемо в JPEG — її беруть OG-картинки й WhatsApp;
 * решту в WebP. Оригінали не видаляємо: нові файли лягають поруч, у листингу міняються посилання.
 */
const BUCKET = 'listing-photos';
const SUPABASE_HOST = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host; } catch { return ''; } })();
const OWN_HOSTS = new Set([SUPABASE_HOST, 'www.hogarli.com', 'hogarli.com'].filter(Boolean));

export function needsRehost(url: string) {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (!OWN_HOSTS.has(u.host)) return true;
  // своє, але AVIF: не відкривається в месенджерах і старих браузерах
  return u.host === SUPABASE_HOST && /\.avif($|\?)/i.test(u.pathname);
}

type Row = { id: string; photos: string[]; photo_rooms: Record<string, string> | null };

async function fetchImage(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { 'User-Agent': 'HogarliBot/1.0 (+https://www.hogarli.com)' } });
  if (!res.ok) throw new Error(`${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 500) throw new Error('empty');
  return buf;
}

async function convert(buf: Buffer, cover: boolean) {
  const img = sharp(buf, { failOn: 'none' }).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true });
  return cover
    ? { data: await img.jpeg({ quality: 82, mozjpeg: true }).toBuffer(), ext: 'jpg', type: 'image/jpeg' }
    : { data: await img.webp({ quality: 80 }).toBuffer(), ext: 'webp', type: 'image/webp' };
}

/**
 * Одна порція: беремо до `budget` фото з тих оголошень, де є що переносити.
 * Битий файл лишаємо як є і рахуємо в failed — повторна спроба його вже не чіпатиме в цьому проході.
 */
export async function rehostBatch(client: SupabaseClient, adminId: string, budget = 30, skip: string[] = []) {
  const { data, error } = await client.from('listings').select('id, photos, photo_rooms').order('created_at').limit(2000);
  if (error) throw error;
  const rows = ((data ?? []) as Row[]).filter((r) => (r.photos ?? []).some((u) => needsRehost(u) && !skip.includes(u)));
  let moved = 0;
  const failed: string[] = [];
  let listings = 0;

  for (const r of rows) {
    if (moved + failed.length >= budget) break;
    const photos = [...r.photos];
    const rooms = { ...(r.photo_rooms ?? {}) };
    let changed = false;
    for (let i = 0; i < photos.length && moved + failed.length < budget; i++) {
      const src = photos[i];
      if (!needsRehost(src) || skip.includes(src)) continue;
      try {
        const out = await convert(await fetchImage(src), i === 0);
        const path = `${adminId}/rehost/${r.id}/${Date.now().toString(36)}-${i}.${out.ext}`;
        const up = await client.storage.from(BUCKET).upload(path, out.data, { contentType: out.type, upsert: false });
        if (up.error) throw new Error(up.error.message);
        const url = client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        photos[i] = url;
        if (rooms[src]) { rooms[url] = rooms[src]; delete rooms[src]; }
        moved++; changed = true;
      } catch (e) {
        failed.push(src);
        console.error('rehost failed', src, (e as Error).message);
      }
    }
    if (changed) {
      const { error: upErr } = await client.from('listings').update({ photos, photo_rooms: rooms }).eq('id', r.id);
      if (upErr) throw upErr;
      listings++;
    }
  }

  // скільки ще лишилось (без тих, що вже впали)
  const skipAll = new Set([...skip, ...failed]);
  const { data: after } = await client.from('listings').select('id, photos').limit(2000);
  const left = ((after ?? []) as Row[]).reduce((n, r) => n + (r.photos ?? []).filter((u) => needsRehost(u) && !skipAll.has(u)).length, 0);
  return { moved, listings, failed, left };
}
