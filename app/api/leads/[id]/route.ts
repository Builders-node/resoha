import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Позначити заявку опрацьованою або повернути в роботу. Доступ — політика leads_update. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json().catch(() => ({}));
  if (status !== 'new' && status !== 'done') {
    return NextResponse.json({ error: 'status must be "new" or "done"' }, { status: 400 });
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('leads').update({ status })
    .eq('id', id).select('*').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ lead: { ...data, listingId: data.listing_id, agentId: data.agent_id } });
}
