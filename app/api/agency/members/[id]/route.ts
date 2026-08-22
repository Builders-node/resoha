import { NextResponse } from 'next/server';
import { mapAgent } from '@/lib/db';
import { supabaseServer } from '@/lib/supabase/server';

type Ctx = { params: Promise<{ id: string }> };

/** Власник редагує профіль, роль або доступ члена команди — межі задає RLS profiles_update. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const b = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof b.name === 'string' && b.name.trim()) patch.name = b.name.trim();
  if (typeof b.phone === 'string') patch.phone = b.phone;
  if (typeof b.whatsapp === 'string') patch.whatsapp = b.whatsapp;
  if (typeof b.about === 'string') patch.about = b.about;
  if (b.experience !== undefined) patch.experience = Number(b.experience) || 0;
  if (b.verified !== undefined) patch.verified = Boolean(b.verified);
  if (b.active !== undefined) patch.active = Boolean(b.active);
  if (b.isOwner !== undefined) patch.is_owner = Boolean(b.isOwner);

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('profiles').update(patch)
    .eq('id', id).select('*, agency:agencies!profiles_agency_id_fkey(name)').maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  if (!data) return NextResponse.json({ error: 'Only the agency owner can edit the team' }, { status: 403 });
  return NextResponse.json({ member: mapAgent(data) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('remove_member', { p_member: id });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json({ ok: true });
}
