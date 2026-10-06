import { NextResponse } from 'next/server';
import { mapAgent } from '@/lib/db';
import { currentUser } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';

/** Редагування власного профілю. Роль і агенція тут не змінюються. */
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim();
  if (typeof b.phone === 'string') patch.phone = b.phone;
  if (typeof b.whatsapp === 'string') patch.whatsapp = b.whatsapp;
  if (typeof b.viber === 'string') patch.viber = b.viber.trim().slice(0, 40);
  if (typeof b.telegram === 'string') patch.telegram = b.telegram.trim().replace(/^https?:\/\/t\.me\//i, '').slice(0, 64);
  if (typeof b.about === 'string') patch.about = b.about;
  if (b.experience !== undefined) patch.experience = Number(b.experience) || 0;
  if (typeof b.avatar === 'string' && /^https?:\/\//.test(b.avatar)) patch.avatar = b.avatar;

  // порожній патч (наприклад, аватар не пройшов валідацію) — не робимо запит, віддаємо як є
  if (!Object.keys(patch).length) return NextResponse.json({ user });

  const supabase = await supabaseServer();
  const save = (p: Record<string, unknown>) => supabase.from('profiles').update(p)
    .eq('id', user.id).select('*, agency:agencies!profiles_agency_id_fkey(name)').maybeSingle();
  let { data, error } = await save(patch);
  // до міграції 0032 колонок viber/telegram немає — решту профілю все одно зберігаємо
  if (error && ('viber' in patch || 'telegram' in patch) && /viber|telegram/.test(error.message)) {
    delete patch.viber; delete patch.telegram;
    ({ data, error } = await save(patch));
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data ? mapAgent(data) : null });
}
