import { NextResponse } from 'next/server';
import { activateCampaign } from '@/lib/promo';
import { getCheckout, stripeEnabled } from '@/lib/stripe';

/**
 * Сюди Stripe повертає покупця після оплати. Сесію перечитуємо в самого Stripe
 * (параметрам в адресі не віримо) і, якщо оплачено, вмикаємо кампанію одразу —
 * не чекаючи вебхука. Вебхук потім прийде й нічого не зламає: активація ідемпотентна.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(new URL(`/agent?tab=promote&${q}`, url.origin), 303);
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId || !stripeEnabled()) return back('paid=0');

  try {
    const session = await getCheckout(sessionId);
    const campaignId = session.metadata?.campaign_id;
    if (!campaignId || session.payment_status !== 'paid') return back('paid=0');
    await activateCampaign(campaignId, 'stripe', session.payment_intent ?? session.id, true);
    return back('paid=1');
  } catch (e) {
    console.error('promo confirm failed:', (e as Error).message);
    // гроші могли пройти — тоді кампанію ввімкне вебхук або адмін
    return back('paid=pending');
  }
}
