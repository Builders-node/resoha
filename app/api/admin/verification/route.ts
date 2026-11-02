import { NextResponse } from 'next/server';
import { adminLog } from '@/lib/db';
import { kickNotifications } from '@/lib/notify';
import { currentUser } from '@/lib/session';
import { adminReviewVerification, adminSetDeveloperVerified, adminVerificationQueue } from '@/lib/verification';

/** Черга перевірки документів. Права ще раз перевіряють RLS і review_verification. */
export async function GET() {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  return NextResponse.json(await adminVerificationQueue());
}

type Body =
  | { kind: 'request'; id: string; decision: 'approved' | 'rejected'; note?: string }
  | { kind: 'developer'; id: string; verified: boolean; reason?: string };

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body?.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const actor = { id: user.id, name: user.name };

  try {
    if (body.kind === 'request') {
      if (body.decision !== 'approved' && body.decision !== 'rejected') {
        return NextResponse.json({ error: 'Bad decision' }, { status: 400 });
      }
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      const done = await adminReviewVerification(body.id, body.decision, note);
      await adminLog(actor, {
        action: `${done.subjectKind}.${body.decision === 'approved' ? 'verify' : 'verify_reject'}`,
        targetKind: done.subjectKind === 'agent' ? 'profile' : done.subjectKind,
        targetId: done.subjectId, targetName: done.subjectName, reason: note,
      });
      kickNotifications();
      return NextResponse.json({ ok: true });
    }
    if (body.kind === 'developer') {
      const done = await adminSetDeveloperVerified(body.id, Boolean(body.verified));
      if (!done) return NextResponse.json({ error: 'Developer not found' }, { status: 404 });
      await adminLog(actor, {
        action: body.verified ? 'developer.verify' : 'developer.unverify',
        targetKind: 'developer', targetId: body.id, targetName: done.name, reason: body.reason,
      });
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
