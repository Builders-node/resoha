import { NextResponse } from 'next/server';
import {
  adminListReports, adminLog, adminModerationQueue, adminReviewListing, adminSetListingFlags, adminSetReport, getListing,
} from '@/lib/db';
import { kickNotifications } from '@/lib/notify';
import { currentUser } from '@/lib/session';

/** Черга модерації й скарги покупців. Права ще раз перевіряє RLS. */
export async function GET() {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const [queue, reports] = await Promise.all([adminModerationQueue(), adminListReports()]);
  // оголошення, на які схоже нове, — щоб модератор порівняв, не відкриваючи вкладок
  const dupIds = [...new Set(queue.map((l) => l.duplicateOf).filter((x): x is string => Boolean(x)))];
  const originals = (await Promise.all(dupIds.map((id) => getListing(id)))).filter(Boolean);
  return NextResponse.json({ queue, reports, originals });
}

type Body =
  | { kind: 'review'; id: string; decision: 'approved' | 'rejected'; note?: string; targetName?: string }
  | { kind: 'report'; id: string; status: 'open' | 'resolved' | 'dismissed'; hideListing?: boolean; reason?: string; targetName?: string };

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body?.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const actor = { id: user.id, name: user.name };

  try {
    if (body.kind === 'review') {
      if (body.decision !== 'approved' && body.decision !== 'rejected') {
        return NextResponse.json({ error: 'Bad decision' }, { status: 400 });
      }
      const note = typeof body.note === 'string' ? body.note.trim() : '';
      if (body.decision === 'rejected' && !note) {
        return NextResponse.json({ error: 'Tell the realtor what to fix' }, { status: 400 });
      }
      const done = await adminReviewListing(body.id, body.decision, note);
      if (!done) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      await adminLog(actor, {
        action: body.decision === 'approved' ? 'listing.approve' : 'listing.reject',
        targetKind: 'listing', targetId: body.id, targetName: done.title, reason: note,
      });
      kickNotifications();
      return NextResponse.json({ ok: true });
    }

    if (body.kind === 'report') {
      if (!['open', 'resolved', 'dismissed'].includes(body.status)) {
        return NextResponse.json({ error: 'Bad status' }, { status: 400 });
      }
      const done = await adminSetReport(body.id, body.status);
      if (!done) return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      if (body.hideListing) await adminSetListingFlags(done.listing_id, { active: false });
      await adminLog(actor, {
        action: `report.${body.status}${body.hideListing ? '+hide' : ''}`,
        targetKind: 'report', targetId: body.id, targetName: body.targetName, reason: body.reason,
      });
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
