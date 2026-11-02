import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';
import { checkBatch, pruneDead } from '@/lib/photoCheck';

/**
 * Адмінка: биті фото.
 * { offset } — перевірити наступну порцію чужих посилань (кнопка ганяє, поки next не null);
 * { prune: [...urls] } — прибрати ці посилання з оголошень, ЖК і логотипів.
 */
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  try {
    const client = await supabaseServer();
    if (Array.isArray(body.prune)) {
      const urls = body.prune.filter((x: unknown) => typeof x === 'string').slice(0, 2000);
      return NextResponse.json(await pruneDead(client, urls));
    }
    const offset = Number.isInteger(body.offset) && body.offset > 0 ? body.offset : 0;
    return NextResponse.json(await checkBatch(client, offset));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
