import { createClient } from '@supabase/supabase-js';
import { compressAll } from './compressImage';

const BUCKET = 'listing-photos';

/**
 * Вантажить фото напряму в Supabase Storage за підписаними посиланнями з /api/uploads.
 * Фото спершу стискаються в браузері (і, якщо треба, отримують знак resoha); PDF — як є.
 * Повертає публічні URL або текст помилки для тосту.
 */
export async function uploadPhotos(
  original: File[],
  opts: { watermark?: boolean; onProgress?: (stage: 'compress' | 'upload', done: number) => void } = {},
): Promise<{ urls: string[] } | { error: string }> {
  const files = await compressAll(original, { watermark: opts.watermark }, (n) => opts.onProgress?.('compress', n));
  opts.onProgress?.('upload', 0);
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error ?? `Upload failed (${res.status})` };

  const storage = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).storage.from(BUCKET);

  const uploads: { path: string; token: string; url: string }[] = data.uploads;
  const results = await Promise.all(uploads.map((u, i) =>
    storage.uploadToSignedUrl(u.path, u.token, files[i], { contentType: files[i].type })));
  const failed = results.findIndex((r) => r.error);
  if (failed >= 0) return { error: `${files[failed].name}: ${results[failed].error!.message}` };

  return { urls: uploads.map((u) => u.url) };
}
