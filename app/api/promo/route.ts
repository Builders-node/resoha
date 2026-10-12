import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import {
  PROMO_KINDS, PROMO_PRODUCTS, attachSession, campaignEffects, campaignTitle, cancelCampaign, createCampaign, fmtMoney,
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
    // «до/після» — лише для кампаній, що вже стартували
    const effects = await campaignEffects(campaigns.filter((c) => c.startsAt && c.startsAt < new Date().toISOString()).map((c) => c.id));
    return NextResponse.json({
      packages, campaigns, targets, effects,
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
      name: campaignTitle(campaign),
      description: `${campaign.targetName} — ${PROMO_PRODUCTS[campaign.product].blurb} (${fmtMoney(campaign.priceCents, campaign.currency)})`,
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
