import { supabaseServer } from './supabase/server';
import type { Agent } from './types';
import {
  mapPlan, mapSubscription, type BillingInterval, type BillingOverview, type Plan, type SubjectKind, type Subscription,
} from './billingShared';
import { createProduct, type StripeSubscription } from './stripe';

/**
 * Тарифи й підписки (міграція 0072). Писати в таблиці можна лише через RPC:
 * сервер — із секретом PROMO_SECRET після перевірки в Stripe, адмін — від свого імені.
 */

export * from './billingShared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const missing = (e: { code?: string; message?: string }) =>
  e.code === '42P01' || e.code === 'PGRST202' || e.code === 'PGRST205' || e.code === '42883';

export class BillingUnavailable extends Error {}
const fail = (e: { code?: string; message: string }): never => {
  if (missing(e)) throw new BillingUnavailable('Run migration 0072 to turn on plans');
  throw new Error(e.message);
};

/** Чий тариф у кабінеті: активної команди, а без неї — самого ріелтора. */
export const subjectOf = (user: Agent): { kind: SubjectKind; id: string } =>
  user.agencyId ? { kind: 'agency', id: user.agencyId } : { kind: 'agent', id: user.id };

export async function listPlans(includeInactive = false): Promise<Plan[]> {
  let sel = (await supabaseServer()).from('billing_plans').select('*');
  if (!includeInactive) sel = sel.eq('active', true);
  const { data, error } = await sel.order('sort');
  if (error) fail(error);
  return (data ?? []).map(mapPlan);
}

export async function getPlanRow(id: string): Promise<(Plan & { stripeProduct: string }) | null> {
  const { data } = await (await supabaseServer()).from('billing_plans').select('*').eq('id', id).maybeSingle();
  return data ? { ...mapPlan(data), stripeProduct: data.stripe_product ?? '' } : null;
}

export async function overview(user: Agent): Promise<BillingOverview & { customer: string }> {
  const subject = subjectOf(user);
  const { data, error } = await (await supabaseServer()).rpc('billing_overview', { p_kind: subject.kind, p_id: subject.id });
  if (error) fail(error);
  const d = data as Row;
  return {
    subject: { ...subject, name: subject.kind === 'agency' ? user.agency : user.name },
    plan: mapPlan(d.plan),
    subscription: d.subscription ? mapSubscription(d.subscription) : null,
    usage: { listings: Number(d.usage?.listings) || 0, developments: Number(d.usage?.developments) || 0, seats: Number(d.usage?.seats) || 0 },
    credits: (d.credits ?? []).map((c: Row) => ({
      product: c.product, kind: c.kind, days: Number(c.days) || 1, count: Number(c.count) || 0, used: Number(c.used) || 0,
    })),
    enforce: !!d.enforce, canManage: !!d.canManage, hadTrial: !!d.hadTrial,
    hasCustomer: !!d.customer, customer: d.customer ?? '',
  };
}

/** Продукт Stripe для тарифу: є — беремо, немає — створюємо й запамʼятовуємо. */
export async function ensureProduct(plan: Plan & { stripeProduct: string }) {
  if (plan.stripeProduct) return plan.stripeProduct;
  const product = await createProduct(`Hogarli ${plan.name}`, plan.id);
  const { error } = await (await supabaseServer())
    .rpc('billing_set_product', { p_secret: process.env.PROMO_SECRET ?? null, p_plan: plan.id, p_product: product.id });
  if (error) console.error('billing_set_product failed:', error.message);
  return product.id;
}

const ts = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

/**
 * Записати стан підписки зі Stripe. Кому вона й який тариф — з metadata, які ми
 * ставимо при оформленні (subject_kind, subject_id, plan_id). Чужі підписки — пропускаємо.
 */
export async function syncSubscription(sub: StripeSubscription): Promise<Subscription | null> {
  const m = sub.metadata ?? {};
  if ((m.subject_kind !== 'agency' && m.subject_kind !== 'agent') || !m.subject_id || !m.plan_id) return null;
  const item = sub.items?.data?.[0];
  const { data, error } = await (await supabaseServer()).rpc('billing_sync', {
    p_secret: process.env.PROMO_SECRET ?? null,
    p_kind: m.subject_kind, p_id: m.subject_id, p_plan: m.plan_id,
    p_interval: item?.price?.recurring?.interval === 'year' ? 'year' : 'month',
    p_status: sub.status, p_customer: typeof sub.customer === 'string' ? sub.customer : '',
    p_subscription: sub.id, p_item: item?.id ?? '',
    p_price: item?.price?.unit_amount ?? 0, p_currency: item?.price?.currency ?? 'usd',
    p_start: ts(sub.current_period_start ?? item?.current_period_start),
    p_end: ts(sub.current_period_end ?? item?.current_period_end),
    p_trial_end: ts(sub.trial_end), p_cancel_at_end: !!sub.cancel_at_period_end, p_canceled_at: ts(sub.canceled_at),
  });
  if (error) fail(error);
  return mapSubscription(data as Row);
}

/** Бонусне просування з тарифу. */
export async function spendCredit(kind: string, targetId: string, product: string, days: number) {
  const { data, error } = await (await supabaseServer())
    .rpc('billing_use_credit', { p_kind: kind, p_target: targetId, p_product: product, p_days: days });
  if (error) fail(error);
  return data as Row;
}

/* ---------- адмін ---------- */

export async function adminSubscriptions(): Promise<Subscription[]> {
  const client = await supabaseServer();
  const { data, error } = await client.from('billing_subscriptions').select('*')
    .order('created_at', { ascending: false }).limit(500);
  if (error) fail(error);
  const rows = (data ?? []) as Row[];
  const ids = (k: SubjectKind) => [...new Set(rows.filter((r) => r.subject_kind === k).map((r) => r.subject_id as string))];
  const [ag, pr] = await Promise.all([
    ids('agency').length ? client.from('agencies').select('id, name').in('id', ids('agency')) : Promise.resolve({ data: [] as Row[] }),
    ids('agent').length ? client.from('profiles').select('id, name').in('id', ids('agent')) : Promise.resolve({ data: [] as Row[] }),
  ]);
  const name = new Map([...(ag.data ?? []), ...(pr.data ?? [])].map((r: Row) => [r.id as string, r.name as string]));
  return rows.map((r) => mapSubscription({ ...r, subject_name: name.get(r.subject_id) ?? '' }));
}

export async function settings(): Promise<{ enforce: boolean; graceDays: number }> {
  const { data, error } = await (await supabaseServer()).rpc('billing_settings');
  if (error) fail(error);
  return { enforce: !!(data as Row)?.enforce, graceDays: Number((data as Row)?.graceDays) || 0 };
}

export async function setEnforce(on: boolean) {
  const { error } = await (await supabaseServer()).rpc('billing_set_enforce', { p_enforce: on });
  if (error) fail(error);
}

export async function grant(kind: SubjectKind, id: string, planId: string, until: string, note: string) {
  const { data, error } = await (await supabaseServer())
    .rpc('billing_grant', { p_kind: kind, p_id: id, p_plan: planId, p_until: until, p_note: note });
  if (error) fail(error);
  return mapSubscription(data as Row);
}

export async function revoke(id: string) {
  const { error } = await (await supabaseServer()).rpc('billing_revoke', { p_id: id });
  if (error) fail(error);
}

export async function savePlan(p: Plan) {
  const { error } = await (await supabaseServer()).from('billing_plans').update({
    name: p.name, blurb: p.blurb, price_month_cents: p.priceMonthCents, price_year_cents: p.priceYearCents,
    max_listings: p.maxListings, max_developments: p.maxDevelopments, max_seats: p.maxSeats,
    credits: p.credits, trial_days: p.trialDays, active: p.active,
  }).eq('id', p.id);
  if (error) fail(error);
}

/** Для вибору акаунта, якому адмін видає тариф. */
export async function grantTargets(): Promise<{ kind: SubjectKind; id: string; name: string }[]> {
  const client = await supabaseServer();
  const [ag, pr] = await Promise.all([
    client.from('agencies').select('id, name').order('name').limit(500),
    client.from('profiles').select('id, name, agency_id, role').eq('role', 'agent').is('agency_id', null).order('name').limit(500),
  ]);
  return [
    ...(ag.data ?? []).map((r: Row) => ({ kind: 'agency' as const, id: r.id, name: r.name })),
    ...(pr.data ?? []).map((r: Row) => ({ kind: 'agent' as const, id: r.id, name: r.name })),
  ];
}

export const intervalOf = (v: unknown): BillingInterval => (v === 'year' ? 'year' : 'month');
