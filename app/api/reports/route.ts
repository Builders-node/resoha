import { NextResponse } from 'next/server';
import { REPORT_REASONS, createReport } from '@/lib/db';
import { clip, looksAutomated, withinLimit } from '@/lib/guard';
import { kickNotifications } from '@/lib/notify';
import { currentUser } from '@/lib/session';
import type { ReportReason } from '@/lib/types';

/** Скарга покупця на оголошення. Межі ті самі, що в заявок: приманка, час, ліміт на адресу. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.listingId) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  if (looksAutomated(body)) return NextResponse.json({ ok: true }, { status: 201 });
  if (!REPORT_REASONS.includes(body.reason)) return NextResponse.json({ error: 'Pick a reason' }, { status: 400 });

  if (!(await withinLimit(req, 'report', 5, 3600))) {
    return NextResponse.json({ error: 'Too many reports from this connection. Please try again later.' }, { status: 429 });
  }

  const user = await currentUser();
  const email = clip(body.email, 200);
  try {
    await createReport({
      listingId: String(body.listingId),
      reason: body.reason as ReportReason,
      message: clip(body.message, 2000),
      email: /^\S+@\S+\.\S+$/.test(email) ? email : user?.email ?? '',
      userId: user?.id ?? null,
    });
  } catch (e) {
    const message = (e as { message?: string }).message ?? '';
    if (/already been reported/i.test(message)) return NextResponse.json({ ok: true }, { status: 201 });
    if (/listing_reports/.test(message)) return NextResponse.json({ error: 'Reports are not available yet' }, { status: 503 });
    return NextResponse.json({ error: 'Could not send the report' }, { status: 400 });
  }
  kickNotifications();
  return NextResponse.json({ ok: true }, { status: 201 });
}
