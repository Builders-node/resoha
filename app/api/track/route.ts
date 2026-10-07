import { NextResponse } from 'next/server';
import { CLIENT_KINDS, trackAfterResponse, type EventKind } from '@/lib/track';

/**
 * Дії покупця на сторінці обʼєкта: відкрив телефон, натиснув месенджер, скопіював
 * посилання, відкрив форму. Повтори й ботів відсіює сама база (track_event).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const kind = body.kind as EventKind;
  const listingId = typeof body.listingId === 'string' ? body.listingId : null;
  const developmentId = typeof body.developmentId === 'string' ? body.developmentId : null;
  if (!CLIENT_KINDS.includes(kind) || (!listingId && !developmentId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await trackAfterResponse({ listingId, developmentId }, kind, { h: req.headers });
  return NextResponse.json({ ok: true });
}
