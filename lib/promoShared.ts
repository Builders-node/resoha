/** Типи й дрібниці просування, які потрібні і серверу, і браузеру (без next/headers). */

export type PromoKind = 'listing' | 'development' | 'building' | 'agency';
export const PROMO_KINDS: PromoKind[] = ['listing', 'development', 'building', 'agency'];
export type PromoStatus = 'pending' | 'active' | 'ended' | 'cancelled';

export type PromoPackage = {
  id: string; kind: PromoKind; days: number; priceCents: number; currency: string; active: boolean;
  /** вид просування (міграція 0060); до неї — завжди featured */
  product: PromoProduct;
};

export type PromoCampaign = {
  id: string; ownerId: string; ownerName?: string;
  kind: PromoKind; targetId: string; targetName: string;
  days: number; priceCents: number; currency: string;
  status: PromoStatus; payMethod: '' | 'stripe' | 'manual'; payRef: string;
  paidAt: string | null; startsAt: string | null; endsAt: string | null;
  impressions: number; clicks: number; createdAt: string;
  /** вид і повернення грошей — міграція 0060 */
  product: PromoProduct;
  refundedAt: string | null; refundCents: number; refundRef: string;
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

/* ---------- види просування (міграція 0060) ---------- */

export type PromoProduct = 'featured' | 'top' | 'highlight' | 'homepage' | 'bump' | 'premium_agent';

/**
 * Усе про види просування — в одному місці: назва, що дає, для чого доступний.
 * Ціни живуть у promo_packages (стартові — у міграції 0060), адмін міняє їх у Promotions.
 */
export const PROMO_PRODUCTS: Record<PromoProduct, { label: string; icon: string; blurb: string; kinds: PromoKind[]; once?: boolean }> = {
  featured: {
    label: 'Featured', icon: 'star', kinds: PROMO_KINDS,
    blurb: 'Featured badge, a spot on the home page and a chance at the Sponsored places in search.',
  },
  top: {
    label: 'Top of search', icon: 'search', kinds: ['listing'],
    blurb: 'One of up to two Sponsored places above the search results that match it.',
  },
  highlight: {
    label: 'Colour highlight', icon: 'brush', kinds: ['listing'],
    blurb: 'The card stands out with a coloured frame in every list.',
  },
  homepage: {
    label: 'Home page spot', icon: 'home', kinds: ['listing'],
    blurb: 'Shown among the featured homes on the Resoha home page.',
  },
  bump: {
    label: 'Bump', icon: 'arrowUp', kinds: ['listing'], once: true,
    blurb: 'Raises the listing to the top of “Newest” once, as if it was just published.',
  },
  premium_agent: {
    label: 'Premium agent', icon: 'verified', kinds: ['listing'],
    blurb: 'On the listing page buyers see only you: no other agents’ listings next to it.',
  },
};
export const PROMO_PRODUCT_KEYS = Object.keys(PROMO_PRODUCTS) as PromoProduct[];
export const isPromoProduct = (v: unknown): v is PromoProduct => typeof v === 'string' && v in PROMO_PRODUCTS;

/** Назва кампанії для чеку й Stripe: «Top of search · listing · 7 days» */
export const campaignTitle = (c: { product: PromoProduct; kind: PromoKind; days: number }) =>
  `${PROMO_PRODUCTS[c.product].label} · ${KIND_LABEL[c.kind].toLowerCase()}${PROMO_PRODUCTS[c.product].once ? '' : ` · ${c.days} days`}`;

/** «До/після»: перегляди й заявки за кампанію проти такого самого вікна перед нею. */
export type PromoEffect = {
  campaignId: string; windowDays: number;
  viewsBefore: number; viewsDuring: number; leadsBefore: number; leadsDuring: number;
};

/** Зміна у відсотках, коли є з чим порівняти: «+40%», «−12%», «new». */
export function liftLabel(before: number, during: number) {
  if (!before) return during ? 'new' : '—';
  const pct = Math.round(((during - before) / before) * 100);
  return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)}%`;
}
