import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import {
  BillingUnavailable, ensureProduct, getPlanRow, intervalOf, listPlans, overview, spendCredit, syncSubscription, type Invoice,
} from '@/lib/billing';
import { isPromoProduct, PROMO_KINDS, type PromoKind } from '@/lib/promoShared';
import {
  changeSubscriptionPrice, createPortalSession, createSubscriptionCheckout, getSubscription, listInvoices, setCancelAtPeriodEnd, stripeEnabled, stripeTestMode,
} from '@/lib/stripe';

/** Вкладка Plan у кабінеті: тариф акаунта, що зайнято, бонуси, тарифи на вибір і рахунки Stripe. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  try {
    const [o, plans] = await Promise.all([overview(user), listPlans()]);
    let invoices: Invoice[] = [];
    if (o.canManage && o.customer && stripeEnabled()) {
      try {
        invoices = (await listInvoices(o.customer)).data
          .filter((i) => i.status !== 'draft')
          .map((i) => ({
            id: i.id, number: i.number ?? '', date: new Date(i.created * 1000).toISOString(),
            amountCents: i.amount_paid || i.amount_due, currency: i.currency, status: i.status ?? '',
            url: i.hosted_invoice_url ?? '', pdf: i.invoice_pdf ?? '',
          }));
      } catch (e) {
        console.error('stripe invoices failed:', (e as Error).message);
      }
    }
    // id клієнта Stripe браузеру не потрібен
    const rest: Partial<typeof o> = { ...o };
    delete rest.customer;
    return NextResponse.json({
      ...rest, plans, invoices,
      payments: stripeEnabled() ? (stripeTestMode() ? 'stripe-test' : 'stripe') : 'manual',
    });
  } catch (e) {
    const unavailable = e instanceof BillingUnavailable;
    return NextResponse.json({ error: (e as Error).message, unavailable }, { status: unavailable ? 503 : 500 });
  }
}

type Body =
  | { action: 'checkout' | 'switch'; planId: string; interval: 'month' | 'year' }
  | { action: 'cancel' | 'resume' | 'portal' }
  | { action: 'credit'; kind: PromoKind; targetId: string; product: string; days: number };

/**
 * Оформити тариф (Stripe Checkout), змінити його, скасувати наприкінці періоду,
 * відкрити портал Stripe або взяти бонусне просування.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const body = await req.json().catch(() => ({})) as Body;
  const origin = new URL(req.url).origin;
  const back = `${origin}/agent?tab=plan`;

  try {
    if (body.action === 'credit') {
      if (!PROMO_KINDS.includes(body.kind) || typeof body.targetId !== 'string' || !isPromoProduct(body.product)) {
        return NextResponse.json({ error: 'Pick what to promote' }, { status: 400 });
      }
      const campaign = await spendCredit(body.kind, body.targetId, body.product, Math.round(Number(body.days)) || 1);
      return NextResponse.json({ ok: true, campaignId: campaign.id });
    }

    const o = await overview(user);
    if (!o.canManage) {
      return NextResponse.json({ error: o.subject.kind === 'agency' ? 'Only the agency owner can change the plan' : 'Not allowed' }, { status: 403 });
    }
    if (!stripeEnabled()) {
      return NextResponse.json({ error: 'Card payments are not set up yet. Write to us and we will switch your plan by hand.' }, { status: 503 });
    }
    const sub = o.subscription && !o.subscription.manual ? o.subscription : null;

    if (body.action === 'portal') {
      if (!o.customer) return NextResponse.json({ error: 'No billing account yet' }, { status: 400 });
      const portal = await createPortalSession(o.customer, back);
      return NextResponse.json({ url: portal.url });
    }

    if (body.action === 'cancel' || body.action === 'resume') {
      if (!sub) return NextResponse.json({ error: 'No paid plan to change' }, { status: 400 });
      await syncSubscription(await setCancelAtPeriodEnd(sub.stripeSubscription, body.action === 'cancel'));
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'checkout' || body.action === 'switch') {
      const plan = await getPlanRow(String(body.planId));
      if (!plan || !plan.active || plan.audience === 'free') {
        return NextResponse.json({ error: 'This plan is not available' }, { status: 400 });
      }
      const interval = intervalOf(body.interval);
      const priceCents = interval === 'year' ? plan.priceYearCents : plan.priceMonthCents;
      if (!priceCents) return NextResponse.json({ error: 'This plan has no price for that period' }, { status: 400 });
      const product = await ensureProduct(plan);
      const metadata = { subject_kind: o.subject.kind, subject_id: o.subject.id, plan_id: plan.id };

      // уже є підписка Stripe — міняємо ціну в ній, а не оформлюємо другу
      if (sub && ['active', 'trialing', 'past_due'].includes(sub.status)) {
        const live = await getSubscription(sub.stripeSubscription);
        const itemId = live.items.data[0]?.id;
        if (!itemId) throw new Error('Subscription has no items');
        await syncSubscription(await changeSubscriptionPrice({ id: live.id, item: itemId },
          { product, priceCents, currency: plan.currency, interval, metadata }));
        return NextResponse.json({ ok: true });
      }

      const session = await createSubscriptionCheckout({
        product, priceCents, currency: plan.currency, interval, metadata,
        trialDays: o.hadTrial ? 0 : plan.trialDays,
        customer: o.customer || undefined, email: user.email || undefined,
        successUrl: `${origin}/api/billing/confirm?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${back}&canceled=1`,
      });
      return NextResponse.json({ checkoutUrl: session.url });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    if (e instanceof BillingUnavailable) return NextResponse.json({ error: e.message, unavailable: true }, { status: 503 });
    console.error('billing action failed:', (e as Error).message);
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
