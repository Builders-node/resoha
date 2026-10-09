import { NextResponse } from 'next/server';
import { clip, looksAutomated, withinLimit } from '@/lib/guard';
import { kickNotifications } from '@/lib/notify';
import { confirmGuest, subscribeGuest, unsubscribeGuest } from '@/lib/searchAlerts';

/**
 * Підписка гостя на пошук (без акаунта):
 *  {action:'subscribe', email, title, query} — лист-підтвердження;
 *  {action:'confirm', token} — з листа-підтвердження;
 *  {action:'stop', token} — відписка з листа добірки.
 * Відповідь на підписку однакова для нової й уже підписаної адреси — щоб нею не перевіряли чужі скриньки.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? '');

  if (action === 'subscribe') {
    if (looksAutomated(b)) return NextResponse.json({ ok: true });
    if (!(await withinLimit(req, 'search-alert', 6, 3600))) {
      return NextResponse.json({ error: 'Too many requests. Please try again in an hour.' }, { status: 429 });
    }
    const email = clip(b.email, 200).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
    }
    const query = clip(b.query, 1000).replace(/^\?/, '');
    const r = await subscribeGuest(email, clip(b.title, 120), query);
    if (r === 'invalid') return NextResponse.json({ error: 'Enter a valid email' }, { status: 400 });
    if (r === 'limited') {
      return NextResponse.json({ error: 'Too many alerts for this email. Please try again tomorrow.' }, { status: 429 });
    }
    if (r === 'unavailable') {
      return NextResponse.json({ error: 'Email alerts are not available right now. Please try again later.' }, { status: 503 });
    }
    kickNotifications();
    return NextResponse.json({ ok: true });
  }

  if (action === 'confirm' || action === 'stop') {
    if (!(await withinLimit(req, 'search-alert-token', 30, 3600))) {
      return NextResponse.json({ error: 'Too many requests. Please try again in an hour.' }, { status: 429 });
    }
    const token = clip(b.token, 128);
    if (action === 'confirm') {
      const s = await confirmGuest(token);
      return s ? NextResponse.json({ ok: true, ...s }) : NextResponse.json({ error: 'Bad link' }, { status: 400 });
    }
    return (await unsubscribeGuest(token))
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'Bad link' }, { status: 400 });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
