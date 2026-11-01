import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

/** Підписка на новини ЖК (міграція 0068). До міграції таблиці немає — відповідаємо «не підписаний». */
async function state(id: string, userId: string | null) {
  const client = await supabaseServer();
  const [{ data: count }, mine] = await Promise.all([
    client.rpc('development_followers', { p_development: id }),
    userId
      ? client.from('development_follows').select('development_id').eq('development_id', id).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return { on: !!mine.data, count: typeof count === 'number' ? count : 0 };
}

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  return NextResponse.json(await state(id, user?.id ?? null));
}

export async function POST(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const { error } = await (await supabaseServer()).from('development_follows')
    .upsert({ development_id: id, user_id: user.id }, { onConflict: 'development_id,user_id', ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(await state(id, user.id));
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const { error } = await (await supabaseServer()).from('development_follows')
    .delete().eq('development_id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(await state(id, user.id));
}
