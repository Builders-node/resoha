import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { myVerifications, submitVerification, withdrawVerification } from '@/lib/verification';
import { DOC_KINDS, MAX_VERIFY_DOCS, type VerifyKind } from '@/lib/verificationShared';
import { kickNotifications } from '@/lib/notify';

const KINDS: VerifyKind[] = ['agent', 'agency', 'developer'];
const isKind = (v: unknown): v is VerifyKind => KINDS.includes(v as VerifyKind);

/** Мої заявки на перевірку: ?kind=developer&id=<uuid> — лише для одного профілю */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const kind = sp.get('kind');
  const items = await myVerifications(isKind(kind) ? kind : undefined, sp.get('id') ?? undefined);
  return NextResponse.json({ items });
}

/** Надіслати заявку. Чи це справді профіль заявника і чи файли в його теці — перевіряє submit_verification. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!isKind(b.kind) || typeof b.subjectId !== 'string') {
    return NextResponse.json({ error: 'Choose what to verify' }, { status: 400 });
  }
  const docs = (Array.isArray(b.documents) ? b.documents : []).slice(0, MAX_VERIFY_DOCS)
    .filter((d: Record<string, unknown>) => typeof d?.path === 'string' && d.path.startsWith(`${user.id}/`))
    .map((d: Record<string, unknown>) => ({
      kind: DOC_KINDS.includes(d.kind as never) ? d.kind : 'other',
      path: String(d.path), name: String(d.name ?? 'document').slice(0, 120),
      size: Number(d.size) || 0, type: String(d.type ?? '').slice(0, 60),
    }));
  if (!docs.length) return NextResponse.json({ error: 'Attach at least one document' }, { status: 400 });
  try {
    const id = await submitVerification({
      kind: b.kind, subjectId: b.subjectId, documents: docs,
      note: typeof b.note === 'string' ? b.note.trim().slice(0, 1000) : '',
    });
    kickNotifications();
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Відкликати свою відкриту заявку: ?id=<uuid> */
export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign-in required' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  try {
    const ok = await withdrawVerification(id);
    if (!ok) return NextResponse.json({ error: 'Request not found or already reviewed' }, { status: 404 });
    return NextResponse.json({ ok });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
