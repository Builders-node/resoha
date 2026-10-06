import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Видає підписані посилання на завантаження в Supabase Storage, у теку користувача —
 * так вимагає storage-політика. Самі файли браузер шле напряму в Storage:
 * через функцію Vercel вони не пролазять, тіло запиту там обмежене 4,5 МБ.
 */
const BUCKET = 'listing-photos';
const MAX_FILES = 12;
const MAX_BYTES = 8 * 1024 * 1024;
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif',
};

type FileMeta = { name?: unknown; type?: unknown; size?: unknown };

export async function POST(req: Request) {
  // Ріелтор вантажить фото обʼєктів, покупець — аватар. Політика Storage
  // все одно пускає лише в теку власного user.id.
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const files: FileMeta[] = Array.isArray(body?.files) ? body.files : [];
  if (!files.length) return NextResponse.json({ error: 'No files received' }, { status: 400 });
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Up to ${MAX_FILES} photos at a time` }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const uploads: { path: string; token: string; url: string }[] = [];

  for (const file of files) {
    const name = String(file.name ?? 'file');
    const ext = EXT[String(file.type)];
    if (!ext) return NextResponse.json({ error: `${name}: only JPEG, PNG, WebP or AVIF` }, { status: 415 });
    if (Number(file.size) > MAX_BYTES) return NextResponse.json({ error: `${name} is over 8 MB` }, { status: 413 });

    const path = `${user.id}/${randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    uploads.push({ path, token: data.token, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
  }

  return NextResponse.json({ uploads }, { status: 201 });
}
