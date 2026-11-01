import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';
import { rehostBatch } from '@/lib/rehostPhotos';

/** Адмінка: перенести чужі та AVIF-фото в Storage порціями (кнопка ганяє, поки left > 0). */
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const skip = Array.isArray(body.skip) ? body.skip.filter((x: unknown) => typeof x === 'string').slice(0, 2000) : [];
  try {
    return NextResponse.json(await rehostBatch(await supabaseServer(), user.id, 20, skip));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
