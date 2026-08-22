import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('leave_agency');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, closed: Boolean(data) });
}
