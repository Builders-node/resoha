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
  if (typeof b.about === 'string') patch.about = b.about;
  if (b.experience !== undefined) patch.experience = Number(b.experience) || 0;
  if (typeof b.avatar === 'string' && /^https?:\/\//.test(b.avatar)) patch.avatar = b.avatar;

  // порожній патч (наприклад, аватар не пройшов валідацію) — не робимо запит, віддаємо як є
  if (!Object.keys(patch).length) return NextResponse.json({ user });

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('profiles').update(patch)
    .eq('id', user.id).select('*, agency:agencies!profiles_agency_id_fkey(name)').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data ? mapAgent(data) : null });
}
