import { NextResponse } from 'next/server';
import { activateCampaign, markRefunded } from '@/lib/promo';
import { verifyWebhook, type Charge, type CheckoutSession, type Refund } from '@/lib/stripe';

/**
 * Вебхук Stripe. У Stripe: Developers → Webhooks → https://<домен>/api/promo/webhook, події:
 *  checkout.session.completed, checkout.session.async_payment_succeeded — оплата (підстраховує
 *    випадок, коли покупець закрив вкладку до повернення на сайт);
 *  charge.refunded, charge.refund.updated, refund.created, refund.updated — повернення грошей
 *    (у тому числі зроблене прямо в кабінеті Stripe): кампанію скасовуємо, позначки знімаємо.
 */
export async function POST(req: Request) {
  const payload = await req.text();
  if (!verifyWebhook(payload, req.headers.get('stripe-signature'))) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }
  const event = JSON.parse(payload) as { type: string; data: { object: Record<string, unknown> } };

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as unknown as CheckoutSession;
    const campaignId = session.metadata?.campaign_id;
    if (campaignId && session.payment_status === 'paid') {
      try {
        await activateCampaign(campaignId, 'stripe', session.payment_intent ?? session.id, true);
      } catch (e) {
        // 500 — Stripe повторить доставку пізніше
        console.error('promo webhook activate failed:', (e as Error).message);
        return NextResponse.json({ error: 'Activation failed' }, { status: 500 });
      }
    }
  }

  const refund = refundOf(event);
  if (refund) {
    try {
      // 0 — платіж не за просування (або вже повернений): просто підтверджуємо доставку
      await markRefunded({ paymentRef: refund.paymentIntent }, { amountCents: refund.amount, refundRef: refund.ref, withSecret: true });
    } catch (e) {
      console.error('promo webhook refund failed:', (e as Error).message);
      return NextResponse.json({ error: 'Refund handling failed' }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}

/** Подія про повернення → платіж, сума і номер повернення; інакше null. */
function refundOf(event: { type: string; data: { object: Record<string, unknown> } }) {
  if (event.type === 'charge.refunded') {
    const ch = event.data.object as unknown as Charge;
    if (!ch.payment_intent || !ch.amount_refunded) return null;
    return { paymentIntent: ch.payment_intent, amount: ch.amount_refunded, ref: ch.id };
  }
  if (event.type === 'refund.created' || event.type === 'refund.updated' || event.type === 'charge.refund.updated') {
    const r = event.data.object as unknown as Refund;
    // невдале чи скасоване повернення грошей не повертає — кампанія лишається
    if (!r.payment_intent || (r.status !== 'succeeded' && r.status !== 'pending')) return null;
    return { paymentIntent: r.payment_intent, amount: r.amount, ref: r.id };
  }
  return null;
}
