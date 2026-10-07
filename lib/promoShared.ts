/** Типи й дрібниці просування, які потрібні і серверу, і браузеру (без next/headers). */

export type PromoKind = 'listing' | 'development' | 'building' | 'agency';
export const PROMO_KINDS: PromoKind[] = ['listing', 'development', 'building', 'agency'];
export type PromoStatus = 'pending' | 'active' | 'ended' | 'cancelled';

export type PromoPackage = {
  id: string; kind: PromoKind; days: number; priceCents: number; currency: string; active: boolean;
};

export type PromoCampaign = {
  id: string; ownerId: string; ownerName?: string;
  kind: PromoKind; targetId: string; targetName: string;
  days: number; priceCents: number; currency: string;
  status: PromoStatus; payMethod: '' | 'stripe' | 'manual'; payRef: string;
  paidAt: string | null; startsAt: string | null; endsAt: string | null;
  impressions: number; clicks: number; createdAt: string;
};

export type PromoTarget = { kind: PromoKind; id: string; name: string; sub: string; featured: boolean; active: boolean };

/** Кампанія, що йде зараз (а не оплачена наперед і чекає своєї черги). */
export const isLive = (c: PromoCampaign, now = Date.now()) =>
  c.status === 'active' && !!c.startsAt && !!c.endsAt
  && new Date(c.startsAt).getTime() <= now && new Date(c.endsAt).getTime() > now;

export const fmtMoney = (cents: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase(), maximumFractionDigits: cents % 100 ? 2 : 0 })
    .format(cents / 100);

export const KIND_LABEL: Record<PromoKind, string> = {
  listing: 'Listing', development: 'Development', building: 'Building', agency: 'Agency',
};
