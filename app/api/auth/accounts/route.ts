import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { chip, dropSessionCookies, readAccounts, upsertAccount, writeAccounts } from '@/lib/accounts';
import { currentUser } from '@/lib/session';
import { supabaseServer } from '@/lib/supabase/server';

/** Інші акаунти цього браузера — для меню перемикання. */
export async function GET() {
  const store = await cookies();
  const me = await currentUser();
  return NextResponse.json({ accounts: readAccounts(store).filter((a) => a.id !== me?.id).map(chip) });
}

/**
 * action: 'switch' — зробити активним збережений акаунт (поточний відкладається в список);
 * action: 'add' — відкласти поточний і звільнити місце для входу в інший.
 */
export async function POST(req: Request) {
  const { action, id } = await req.json().catch(() => ({}));
  const store = await cookies();
  const supabase = await supabaseServer();
  let list = readAccounts(store);

  // поточну сесію відкладаємо з її найсвіжішим refresh-токеном
  const me = await currentUser();
  const { data: { session } } = await supabase.auth.getSession();
  const parked = me && session
    ? { id: me.id, name: me.name, email: me.email, avatar: me.avatar, rt: session.refresh_token }
    : null;

  if (action === 'add') {
    if (parked) list = upsertAccount(list, parked);
    writeAccounts(store, list);
    dropSessionCookies(store);
    return NextResponse.json({ ok: true });
  }

  if (action !== 'switch') return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  const target = list.find((a) => a.id === id);
  if (!target) return NextResponse.json({ error: 'This account is not saved here' }, { status: 404 });

  const { error } = await supabase.auth.refreshSession({ refresh_token: target.rt });
  list = list.filter((a) => a.id !== target.id);
  if (error) {
    // сесія протухла або її відкликали — прибираємо зі списку, треба увійти заново
    writeAccounts(store, list);
    return NextResponse.json({ error: `Sign in to ${target.name || target.email} again` }, { status: 401 });
  }

  if (parked && parked.id !== target.id) list = upsertAccount(list, parked);
  writeAccounts(store, list);
  return NextResponse.json({ ok: true });
}

/** Прибрати акаунт із меню цього браузера. */
export async function DELETE(req: Request) {
  const { id } = await req.json().catch(() => ({}));
  const store = await cookies();
  writeAccounts(store, readAccounts(store).filter((a) => a.id !== id));
  return NextResponse.json({ ok: true });
}
