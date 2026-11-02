/** Типи й дрібниці тарифів (міграція 0072), потрібні і серверу, і браузеру. */
import type { PromoKind, PromoProduct } from './promoShared';

export type PlanAudience = 'free' | 'agency' | 'developer';
export type SubjectKind = 'agency' | 'agent';
export type BillingInterval = 'month' | 'year';

/** Бонусне просування на кожен місяць підписки. */
export type PlanCredit = { product: PromoProduct; kind: PromoKind; days: number; count: number };

export type Plan = {
  id: string; audience: PlanAudience; name: string; blurb: string;
  priceMonthCents: number; priceYearCents: number; currency: string;
  /** null — без ліміту */
  maxListings: number | null; maxDevelopments: number | null; maxSeats: number | null;
  credits: PlanCredit[]; trialDays: number; sort: number; active: boolean;
};

export type SubStatus = 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'paused';

export type Subscription = {
  id: string; subjectKind: SubjectKind; subjectId: string; subjectName?: string;
  planId: string; interval: BillingInterval | 'manual'; status: SubStatus;
  priceCents: number; currency: string;
  periodStart: string | null; periodEnd: string | null; trialEnd: string | null;
  cancelAtPeriodEnd: boolean; canceledAt: string | null;
  manual: boolean; note: string; stripeSubscription: string; createdAt: string;
};

export type Usage = { listings: number; developments: number; seats: number };

export type BillingOverview = {
  subject: { kind: SubjectKind; id: string; name: string };
  plan: Plan; subscription: Subscription | null; usage: Usage;
  credits: (PlanCredit & { used: number })[];
  enforce: boolean; canManage: boolean; hadTrial: boolean; hasCustomer: boolean;
};

export type Invoice = {
  id: string; number: string; date: string; amountCents: number; currency: string; status: string;
  url: string; pdf: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const num = (v: unknown) => (v == null ? null : Number(v));

export const mapPlan = (r: Row): Plan => ({
  id: r.id, audience: r.audience, name: r.name, blurb: r.blurb ?? '',
  priceMonthCents: r.price_month_cents ?? 0, priceYearCents: r.price_year_cents ?? 0, currency: r.currency ?? 'usd',
  maxListings: num(r.max_listings), maxDevelopments: num(r.max_developments), maxSeats: num(r.max_seats),
  credits: Array.isArray(r.credits) ? r.credits.map((c: Row) => ({
    product: c.product, kind: c.kind, days: Number(c.days) || 1, count: Number(c.count) || 0,
  })) : [],
  trialDays: r.trial_days ?? 0, sort: r.sort ?? 0, active: r.active !== false,
});

export const mapSubscription = (r: Row): Subscription => ({
  id: r.id, subjectKind: r.subject_kind, subjectId: r.subject_id, subjectName: r.subject_name,
  planId: r.plan_id, interval: r.billing_interval, status: r.status,
  priceCents: r.price_cents ?? 0, currency: r.currency ?? 'usd',
  periodStart: r.current_period_start, periodEnd: r.current_period_end, trialEnd: r.trial_end,
  cancelAtPeriodEnd: !!r.cancel_at_period_end, canceledAt: r.canceled_at,
  manual: !!r.manual, note: r.note ?? '', stripeSubscription: r.stripe_subscription ?? '', createdAt: r.created_at,
});

/** Ціна за місяць при оплаті за рік — щоб порівнювати з помісячною. */
export const perMonth = (p: Plan, interval: BillingInterval) =>
  interval === 'year' ? Math.round(p.priceYearCents / 12) : p.priceMonthCents;

export const yearSavingPct = (p: Plan) =>
  p.priceMonthCents && p.priceYearCents ? Math.max(0, Math.round((1 - p.priceYearCents / (p.priceMonthCents * 12)) * 100)) : 0;

export const limitLabel = (n: number | null) => (n == null ? 'Unlimited' : String(n));

export const STATUS_LABEL: Record<SubStatus, string> = {
  trialing: 'Free trial', active: 'Active', past_due: 'Payment failed', unpaid: 'Unpaid', canceled: 'Cancelled',
  incomplete: 'Awaiting payment', incomplete_expired: 'Expired', paused: 'Paused',
};
