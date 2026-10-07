import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readAccounts, writeAccounts } from '@/lib/accounts';
import { supabaseServer } from '@/lib/supabase/server';

/** Вихід з активного акаунта; якщо в браузері відкладено інші — переходимо в наступний. */
export async function POST() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();

  const store = await cookies();
  let list = readAccounts(store);
  while (list.length) {
    const [next, ...rest] = list;
    list = rest;
    const { error } = await supabase.auth.refreshSession({ refresh_token: next.rt });
    if (!error) {
      writeAccounts(store, list);
      return NextResponse.json({ ok: true, switchedTo: next.name });
    }
  }
  writeAccounts(store, list);
  return NextResponse.json({ ok: true });
}
