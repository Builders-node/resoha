import { NextResponse } from 'next/server';
import { mapAgency } from '@/lib/db';
import { currentUserWithAgency } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const { user, agency } = await currentUserWithAgency();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  return NextResponse.json({ agency, isOwner: user.isOwner });
}

/** Відкрити власну агенцію — вся логіка в RPC create_agency (перевірки на боці БД). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('create_agency', {
    p_name: b.name ?? '', p_phone: b.phone ?? '', p_email: b.email ?? '',
    p_about: b.about ?? '', p_brand: b.brand ?? '#16305c',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ agency: mapAgency(data) }, { status: 201 });
}

/** Редагувати картку агенції: доступ вирішує RLS-політика agencies_update. */
export async function PATCH(req: Request) {
  const { user } = await currentUserWithAgency();
  if (!user?.agencyId) return NextResponse.json({ error: 'You are not in an agency' }, { status: 400 });

  const b = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim();
  if (typeof b.phone === 'string') patch.phone = b.phone;
  if (typeof b.email === 'string') patch.email = b.email;
  if (typeof b.about === 'string') patch.about = b.about;
  if (typeof b.brand === 'string' && /^#[0-9a-f]{6}$/i.test(b.brand)) patch.brand = b.brand;

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('agencies').update(patch)
    .eq('id', user.agencyId).select('*').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'Only the agency owner can edit this' }, { status: 403 });
  return NextResponse.json({ agency: mapAgency(data) });
}
