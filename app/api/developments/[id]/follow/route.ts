import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { followState } from '@/lib/follows';
import { supabaseServer } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

/** Підписка на оновлення ЖК (міграція 0068): стан і перемикач для банера «Key updates». */
const state = followState;

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
