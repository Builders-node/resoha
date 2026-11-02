import { NextResponse } from 'next/server';
import { syncSubscription } from '@/lib/billing';
import { getCheckoutWithSubscription, getSubscription, stripeEnabled } from '@/lib/stripe';

/**
 * Сюди Stripe повертає після оформлення тарифу. Сесію перечитуємо в самого Stripe
 * і записуємо підписку одразу, не чекаючи вебхука (він потім нічого не зламає).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/agent?tab=plan&${q}`, url.origin), 303);
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId || !stripeEnabled()) return back('subscribed=0');
  try {
    const session = await getCheckoutWithSubscription(sessionId);
    if (session.mode !== 'subscription' || !session.subscription) return back('subscribed=0');
    const sub = typeof session.subscription === 'string' ? await getSubscription(session.subscription) : session.subscription;
    await syncSubscription(sub);
    return back('subscribed=1');
  } catch (e) {
    console.error('billing confirm failed:', (e as Error).message);
    // оплата могла пройти — тоді підписку запише вебхук
    return back('subscribed=pending');
  }
}
