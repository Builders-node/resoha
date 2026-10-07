import { NextResponse } from 'next/server';
import { activateCampaign } from '@/lib/promo';
import { verifyWebhook, type CheckoutSession } from '@/lib/stripe';

/**
 * Вебхук Stripe (подія checkout.session.completed / async_payment_succeeded).
 * Підстраховує випадок, коли покупець закрив вкладку до повернення на сайт.
 * У Stripe: Developers → Webhooks → https://<домен>/api/promo/webhook.
 */
export async function POST(req: Request) {
  const payload = await req.text();
  if (!verifyWebhook(payload, req.headers.get('stripe-signature'))) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  }
  const event = JSON.parse(payload) as { type: string; data: { object: CheckoutSession } };
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
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
  return NextResponse.json({ received: true });
}
