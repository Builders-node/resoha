import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Відписка за токеном із листа — без входу. Токен випадковий і знає його лише адресат. */
export async function POST(req: Request) {
  const { token, what } = await req.json().catch(() => ({}));
  if (typeof token !== 'string' || token.length < 20) return NextResponse.json({ error: 'Bad link' }, { status: 400 });
  const { data, error } = await (await supabaseServer()).rpc('notify_unsubscribe', {
    p_token: token, p_what: what === 'leads' ? 'leads' : 'alerts',
  });
  if (error || !data) return NextResponse.json({ error: 'Bad link' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
