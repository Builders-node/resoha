import { NextResponse } from 'next/server';
import { adminLog } from '@/lib/db';
import { currentUser } from '@/lib/session';
import {
  PROMO_KINDS, PROMO_PRODUCTS, activateCampaign, campaignEffects, cancelCampaign, fmtMoney, getCampaign, isPromoProduct,
  listCampaigns, listPackages, markRefunded, savePackage, sweepPromotions, type PromoKind, type PromoProduct,
} from '@/lib/promo';
import { createRefund, paymentIntentOf, stripeEnabled, stripeTestMode } from '@/lib/stripe';

/** Вкладка Promotions в адмінці: усі кампанії, виручка, ціни пакетів. */
export async function GET() {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  try {
    await sweepPromotions();
    const [campaigns, packages] = await Promise.all([listCampaigns({ all: true }), listPackages(true)]);
    const effects = await campaignEffects(campaigns.filter((c) => c.status === 'active' || c.status === 'ended').map((c) => c.id));
    return NextResponse.json({
      campaigns, packages, effects,
      payments: stripeEnabled() ? (stripeTestMode() ? 'stripe-test' : 'stripe') : 'manual',
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, unavailable: true }, { status: 503 });
  }
}

type Action =
  | { action: 'activate' | 'cancel'; id: string; ref?: string }
  | { action: 'refund'; id: string }
  | { action: 'package'; id?: string; kind: PromoKind; product?: PromoProduct; days: number; priceCents: number; active: boolean };

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const body = await req.json().catch(() => ({})) as Action;
  const actor = { id: user.id, name: user.name };

  try {
    if (body.action === 'activate' || body.action === 'cancel') {
      const c = await getCampaign(body.id);
      if (!c) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      if (body.action === 'activate') await activateCampaign(body.id, 'manual', (body.ref ?? '').slice(0, 200));
      else await cancelCampaign(body.id);
      await adminLog(actor, {
        action: `campaign.${body.action}`, targetKind: 'campaign', targetId: body.id,
        targetName: `${c.targetName} · ${c.days}d`,
      });
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'refund') return await refund(body.id, actor);
    if (body.action === 'package') {
      const days = Math.round(Number(body.days));
      const priceCents = Math.round(Number(body.priceCents));
      const product = body.product ?? 'featured';
      if (!PROMO_KINDS.includes(body.kind) || !(days >= 1 && days <= 365) || !(priceCents >= 0)
        || !isPromoProduct(product) || !PROMO_PRODUCTS[product].kinds.includes(body.kind)) {
        return NextResponse.json({ error: 'Check the duration (1–365 days) and price' }, { status: 400 });
      }
      await savePackage({ id: body.id, kind: body.kind, product, days, priceCents, active: body.active !== false });
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

/**
 * Повернути гроші за кампанію й зупинити її. Оплачене через Stripe повертаємо через API Stripe
 * (вебхук charge.refunded потім прийде й нічого не зламає); оплачене вручну — лише
 * позначаємо: гроші адмін повертає тим самим шляхом, яким їх отримав.
 */
async function refund(id: string, actor: { id: string; name: string }) {
  const c = await getCampaign(id);
  if (!c) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (c.refundedAt) return NextResponse.json({ error: 'Already refunded' }, { status: 400 });
  if (!c.paidAt || (c.status !== 'active' && c.status !== 'ended')) {
    return NextResponse.json({ error: 'Only paid campaigns can be refunded' }, { status: 400 });
  }

  let refundRef = 'manual';
  let amount = c.priceCents;
  if (c.payMethod === 'stripe') {
    if (!stripeEnabled()) {
      return NextResponse.json({ error: 'Stripe is not connected here — refund it in the Stripe dashboard instead' }, { status: 400 });
    }
    try {
      const pi = await paymentIntentOf(c.payRef);
      if (!pi) return NextResponse.json({ error: 'No Stripe payment is linked to this campaign' }, { status: 400 });
      const r = await createRefund(pi, c.id);
      refundRef = r.id;
      amount = r.amount;
    } catch (e) {
      return NextResponse.json({ error: `Stripe: ${(e as Error).message}` }, { status: 502 });
    }
  }
  await markRefunded({ id: c.id }, { amountCents: amount, refundRef });
  await adminLog(actor, {
    action: 'campaign.refund', targetKind: 'campaign', targetId: c.id,
    targetName: `${c.targetName} · ${PROMO_PRODUCTS[c.product].label} · ${fmtMoney(amount, c.currency)}${refundRef === 'manual' ? ' (manual)' : ''}`,
  });
  return NextResponse.json({ ok: true, refundRef });
}
