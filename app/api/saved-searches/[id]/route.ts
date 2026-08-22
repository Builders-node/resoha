import { NextResponse } from 'next/server';
import { deleteSavedSearch } from '@/lib/db';
import { currentUser } from '@/lib/session';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ ok: await deleteSavedSearch(id) });
}
