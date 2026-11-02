import { NextResponse } from 'next/server';
import { adminLog } from '@/lib/db';
import { currentUser } from '@/lib/session';
import {
  BillingUnavailable, adminSubscriptions, grant, grantTargets, listPlans, revoke, savePlan, setEnforce, settings,
  type Plan, type SubjectKind,
} from '@/lib/billing';
import { isPromoProduct, PROMO_KINDS, PROMO_PRODUCTS } from '@/lib/promoShared';
import { stripeEnabled, stripeTestMode } from '@/lib/stripe';

/** Вкладка Billing в адмінці: тарифи, підписки, ручні тарифи, перемикач лімітів. */
export async function GET() {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  try {
    const [plans, subscriptions, config, targets] = await Promise.all([
      listPlans(true), adminSubscriptions(), settings(), grantTargets(),
    ]);
    return NextResponse.json({
      plans, subscriptions, ...config, targets,
      payments: stripeEnabled() ? (stripeTestMode() ? 'stripe-test' : 'stripe') : 'manual',
    });
  } catch (e) {
    const unavailable = e instanceof BillingUnavailable;
    return NextResponse.json({ error: (e as Error).message, unavailable }, { status: unavailable ? 503 : 500 });
  }
}

type Body =
  | { action: 'plan'; plan: Plan }
  | { action: 'grant'; kind: SubjectKind; id: string; planId: string; until: string; note?: string }
  | { action: 'revoke'; id: string }
  | { action: 'enforce'; on: boolean };

const lim = (v: unknown) => (v === null || v === '' || v === undefined ? null : Math.max(0, Math.round(Number(v))));

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const body = await req.json().catch(() => ({})) as Body;
  const actor = { id: user.id, name: user.name };
  try {
    if (body.action === 'plan') {
      const p = body.plan;
      const credits = (Array.isArray(p.credits) ? p.credits : [])
        .filter((c) => isPromoProduct(c.product) && PROMO_KINDS.includes(c.kind) && PROMO_PRODUCTS[c.product].kinds.includes(c.kind))
        .map((c) => ({ product: c.product, kind: c.kind, days: Math.min(365, Math.max(1, Math.round(Number(c.days)) || 1)), count: Math.max(0, Math.round(Number(c.count)) || 0) }))
        .filter((c) => c.count > 0);
      const plan: Plan = {
        ...p, name: String(p.name ?? '').trim().slice(0, 60) || p.id, blurb: String(p.blurb ?? '').slice(0, 300),
        priceMonthCents: Math.max(0, Math.round(Number(p.priceMonthCents)) || 0),
        priceYearCents: Math.max(0, Math.round(Number(p.priceYearCents)) || 0),
        maxListings: lim(p.maxListings), maxDevelopments: lim(p.maxDevelopments),
        maxSeats: lim(p.maxSeats) === 0 ? 1 : lim(p.maxSeats),
        trialDays: Math.min(90, Math.max(0, Math.round(Number(p.trialDays)) || 0)),
        credits, active: p.active !== false,
      };
      await savePlan(plan);
      await adminLog(actor, { action: 'plan.update', targetKind: 'site', targetId: null, targetName: `${plan.name} (${plan.id})` });
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'grant') {
      if ((body.kind !== 'agency' && body.kind !== 'agent') || Number.isNaN(Date.parse(body.until))) {
        return NextResponse.json({ error: 'Pick the account and an end date' }, { status: 400 });
      }
      const s = await grant(body.kind, body.id, body.planId, new Date(body.until).toISOString(), String(body.note ?? ''));
      await adminLog(actor, {
        action: 'plan.grant', targetKind: body.kind === 'agency' ? 'agency' : 'profile', targetId: body.id,
        targetName: `${s.planId} until ${s.periodEnd?.slice(0, 10)}`, reason: body.note ?? '',
      });
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'revoke') {
      await revoke(body.id);
      await adminLog(actor, { action: 'plan.revoke', targetKind: 'site', targetId: null, targetName: body.id });
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'enforce') {
      await setEnforce(!!body.on);
      await adminLog(actor, { action: body.on ? 'plan.limits_on' : 'plan.limits_off', targetKind: 'site', targetId: null });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: e instanceof BillingUnavailable ? 503 : 400 });
  }
}
