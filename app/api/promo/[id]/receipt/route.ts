import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { PROMO_PRODUCTS, campaignTitle, fmtMoney, getCampaign } from '@/lib/promo';
import { getPaymentIntent, paymentIntentOf, stripeEnabled } from '@/lib/stripe';
import { Booklet, TONE } from '@/lib/pdf';
import { fmtDate } from '@/lib/format';
import { SITE_NAME, SITE_URL } from '@/lib/site';

/**
 * Чек за просування. За замовчуванням — свій PDF (працює і без Stripe, і для ручних оплат);
 * ?stripe=1 — переадресація на чек Stripe, якщо платіж ішов через нього.
 * Бачить лише власник кампанії або адмін (RLS promo_campaigns).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const { id } = await params;
  const c = await getCampaign(id, true);
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!c.paidAt) return NextResponse.json({ error: 'This campaign has not been paid yet' }, { status: 400 });

  if (new URL(req.url).searchParams.get('stripe') === '1' && c.payMethod === 'stripe' && stripeEnabled()) {
    try {
      const pi = await paymentIntentOf(c.payRef);
      const url = pi ? (await getPaymentIntent(pi)).latest_charge?.receipt_url : null;
      if (url) return NextResponse.redirect(url, 303);
    } catch (e) {
      console.error('stripe receipt failed:', (e as Error).message);
    }
    // чек Stripe недоступний — віддаємо свій
  }

  const no = `R-${c.id.slice(0, 8).toUpperCase()}`;
  const b = await Booklet.create(`${SITE_NAME} receipt ${no}`, 'Receipt');
  b.heading(`Receipt ${no}`, 18);
  b.paragraph(`Paid ${fmtDate(c.paidAt)}`, 10.5, { color: TONE.muted });
  b.row('Billed to', c.ownerName || (c.ownerId === user.id ? user.name : '') || '-');
  b.row('Service', campaignTitle(c));
  b.row('Promoted item', c.targetName || '-');
  b.row('What it includes', PROMO_PRODUCTS[c.product].blurb);
  if (c.startsAt && c.endsAt) b.row('Period', `${fmtDate(c.startsAt)} - ${fmtDate(c.endsAt)}`);
  b.row('Payment method', c.payMethod === 'stripe' ? 'Card (Stripe)' : 'Manual payment');
  if (c.payRef) b.row('Payment reference', c.payRef);
  b.row('Amount paid', fmtMoney(c.priceCents, c.currency));
  if (c.refundedAt) {
    b.row('Refunded', `${fmtMoney(c.refundCents || c.priceCents, c.currency)} on ${fmtDate(c.refundedAt)}`, { color: TONE.bad });
    if (c.refundRef && c.refundRef !== 'manual') b.row('Refund reference', c.refundRef);
  }
  b.row('Total', fmtMoney(c.priceCents - (c.refundedAt ? c.refundCents || c.priceCents : 0), c.currency));
  return b.response(`resoha-receipt-${no}.pdf`, `${SITE_NAME} - ${SITE_URL}. This receipt confirms payment for advertising on the site.`);
}
