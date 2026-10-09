import { NextResponse } from 'next/server';
import { revokeInvite } from '@/lib/team';

type Ctx = { params: Promise<{ id: string }> };

/** Відкликати запрошення: посилання з листа більше не спрацює. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const error = await revokeInvite(id);
  if (error) return NextResponse.json({ error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
