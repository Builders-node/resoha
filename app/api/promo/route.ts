import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import {
  KIND_LABEL, PROMO_KINDS, attachSession, cancelCampaign, createCampaign, fmtMoney,
  listCampaigns, listPackages, promoTargets, sweepPromotions, type PromoKind,
} from '@/lib/promo';
import { createCheckout, stripeEnabled, stripeTestMode } from '@/lib/stripe';

/** Вкладка Promote у кабінеті: пакети, що можна просувати, і свої кампанії. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  try {
    await sweepPromotions();
    const [packages, campaigns, targets] = await Promise.all([listPackages(), listCampaigns(), promoTargets(user)]);
    return NextResponse.json({
      packages, campaigns, targets,
      payments: stripeEnabled() ? (stripeTestMode() ? 'stripe-test' : 'stripe') : 'manual',
    });
  } catch (e) {
    // база ще без міграції 0046
    return NextResponse.json({ error: (e as Error).message, unavailable: true }, { status: 503 });
  }
}

/**
 * Нова кампанія. Зі Stripe — повертаємо посилання на Checkout; без нього заявка
 * лишається «очікує оплати», і адмін активує її, коли гроші надійдуть.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const kind = body.kind as PromoKind;
  if (!PROMO_KINDS.includes(kind) || typeof body.targetId !== 'string' || typeof body.packageId !== 'string') {
    return NextResponse.json({ error: 'Pick what to promote and for how long' }, { status: 400 });
  }

  let campaign;
  try {
    campaign = await createCampaign(kind, body.targetId, body.packageId);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (!stripeEnabled()) return NextResponse.json({ campaign, checkoutUrl: null });

  const origin = new URL(req.url).origin;
  try {
    const session = await createCheckout({
      campaignId: campaign.id,
      name: `Featured ${KIND_LABEL[kind].toLowerCase()} · ${campaign.days} days`,
      description: `${campaign.targetName} — first in search and on the home page with a Featured badge (${fmtMoney(campaign.priceCents, campaign.currency)})`,
      amountCents: campaign.priceCents,
      currency: campaign.currency,
      email: user.email || undefined,
      successUrl: `${origin}/api/promo/confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/agent?tab=promote&canceled=1`,
    });
    await attachSession(campaign.id, session.id);
    return NextResponse.json({ campaign, checkoutUrl: session.url });
  } catch (e) {
    // оплату не відкрили — заявку не лишаємо висіти
    await cancelCampaign(campaign.id).catch(() => {});
    console.error('Stripe checkout failed:', (e as Error).message);
    return NextResponse.json({ error: 'Payment is unavailable right now, please try again later' }, { status: 502 });
  }
}
