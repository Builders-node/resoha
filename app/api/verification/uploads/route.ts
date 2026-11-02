import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';
import { MAX_VERIFY_BYTES, MAX_VERIFY_DOCS, VERIFY_BUCKET, VERIFY_TYPES } from '@/lib/verificationShared';

/**
 * Підписані посилання на завантаження документів у закритий бакет verification-docs,
 * у теку користувача. Публічних адрес у цих файлів немає: читає їх лише власник і адмін.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const files: { name?: unknown; type?: unknown; size?: unknown }[] = Array.isArray(body?.files) ? body.files : [];
  if (!files.length) return NextResponse.json({ error: 'No files received' }, { status: 400 });
  if (files.length > MAX_VERIFY_DOCS) return NextResponse.json({ error: `Up to ${MAX_VERIFY_DOCS} files at a time` }, { status: 400 });

  const supabase = await supabaseServer();
  const uploads: { path: string; token: string }[] = [];
  for (const file of files) {
    const name = String(file.name ?? 'file');
    const ext = VERIFY_TYPES[String(file.type)];
    if (!ext) return NextResponse.json({ error: `${name}: only PDF, JPEG, PNG or WebP` }, { status: 415 });
    if (Number(file.size) > MAX_VERIFY_BYTES) return NextResponse.json({ error: `${name} is over 20 MB` }, { status: 413 });
    const path = `${user.id}/${randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage.from(VERIFY_BUCKET).createSignedUploadUrl(path);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    uploads.push({ path, token: data.token });
  }
  return NextResponse.json({ uploads }, { status: 201 });
}
