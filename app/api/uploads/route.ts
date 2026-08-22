import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';

/** Фото летять у Supabase Storage, у папку користувача — так вимагає storage-політика. */
const BUCKET = 'listing-photos';
const MAX_FILES = 12;
const MAX_BYTES = 8 * 1024 * 1024;
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif',
};

export async function POST(req: Request) {
  // Ріелтор вантажить фото обʼєктів, покупець — аватар. Політика Storage
  // все одно пускає лише в теку власного user.id.
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const files = form?.getAll('files').filter((f): f is File => f instanceof File) ?? [];
  if (!files.length) return NextResponse.json({ error: 'No files received' }, { status: 400 });
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Up to ${MAX_FILES} photos at a time` }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const urls: string[] = [];

  for (const file of files) {
    const ext = EXT[file.type];
    if (!ext) return NextResponse.json({ error: `${file.name}: only JPEG, PNG, WebP or AVIF` }, { status: 415 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: `${file.name} is over 8 MB` }, { status: 413 });

    const path = `${user.id}/${randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    urls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl);
  }

  return NextResponse.json({ urls }, { status: 201 });
}
