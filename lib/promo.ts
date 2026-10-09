import { after } from 'next/server';
import { headers } from 'next/headers';
import { supabaseServer } from './supabase/server';
import type { Agent } from './types';
import { isPromoProduct, type PromoCampaign, type PromoEffect, type PromoKind, type PromoPackage, type PromoProduct, type PromoTarget } from './promoShared';

/**
 * Платне просування (міграція 0046). Кампанія = Featured на N днів для оголошення,
 * ЖК, дому чи агенції. Ціни й строки — у promo_packages, кампанії — у promo_campaigns;
 * писати в них можна лише через RPC, права перевіряє база.
 */

export * from './promoShared';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const mapPackage = (r: Row): PromoPackage => ({
  id: r.id, kind: r.target_kind, days: r.days, priceCents: r.price_cents, currency: r.currency, active: r.active,
  product: isPromoProduct(r.product) ? r.product : 'featured',
});

const mapCampaign = (r: Row): PromoCampaign => ({
  id: r.id, ownerId: r.owner_id, ownerName: r.owner?.name,
  kind: r.target_kind, targetId: r.target_id, targetName: r.target_name,
  days: r.days, priceCents: r.price_cents, currency: r.currency,
  status: r.status, payMethod: r.pay_method, payRef: r.pay_ref,
  paidAt: r.paid_at, startsAt: r.starts_at, endsAt: r.ends_at,
  impressions: r.impressions, clicks: r.clicks, createdAt: r.created_at,
  // до міграції 0060 колонок немає — усе Featured і без повернень
  product: isPromoProduct(r.product) ? r.product : 'featured',
  refundedAt: r.refunded_at ?? null, refundCents: r.refund_cents ?? 0, refundRef: r.refund_ref ?? '',
});

export async function listPackages(includeInactive = false): Promise<PromoPackage[]> {
  let sel = (await supabaseServer()).from('promo_packages').select('*');
  if (!includeInactive) sel = sel.eq('active', true);
  const { data, error } = await sel.order('target_kind').order('days');
  if (error) throw error;
  return (data ?? []).map(mapPackage);
}

/** Свої кампанії (RLS віддає лише їх); адміну — усі, з іменем власника. */
export async function listCampaigns(opts: { all?: boolean } = {}): Promise<PromoCampaign[]> {
  const client = await supabaseServer();
  const cols = opts.all ? '*, owner:profiles!promo_campaigns_owner_id_fkey(name)' : '*';
  let sel = client.from('promo_campaigns').select(cols);
  if (!opts.all) {
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) return [];
    sel = sel.eq('owner_id', auth.user.id);
  }
  const { data, error } = await sel.order('created_at', { ascending: false }).limit(opts.all ? 500 : 100);
  if (error) throw error;
  return (data ?? []).map(mapCampaign);
}

export async function getCampaign(id: string, withOwner = false): Promise<PromoCampaign | null> {
  const cols = withOwner ? '*, owner:profiles!promo_campaigns_owner_id_fkey(name)' : '*';
  const { data } = await (await supabaseServer()).from('promo_campaigns').select(cols).eq('id', id).maybeSingle();
  return data ? mapCampaign(data) : null;
}

/** Що людина може просувати: свої оголошення, ЖК і доми, а також агенції, де вона власник. */
export async function promoTargets(user: Agent): Promise<PromoTarget[]> {
  const client = await supabaseServer();
  const { data: owned } = await client.from('agency_members')
    .select('agency_id').eq('profile_id', user.id).eq('is_owner', true);
  const agencyIds = [...new Set([
    ...(owned ?? []).map((m: Row) => m.agency_id as string),
    ...(user.isOwner && user.agencyId ? [user.agencyId] : []),
  ])];
  const mine = agencyIds.length ? `agent_id.eq.${user.id},agency_id.in.(${agencyIds.join(',')})` : `agent_id.eq.${user.id}`;

  const [listings, devs, agencies] = await Promise.all([
    client.from('listings').select('id, title, neighborhood, active, featured, unit_no').or(mine)
      .order('created_at', { ascending: false }).limit(500),
    client.from('developments').select('id, name, neighborhood, active, featured').or(mine).order('name'),
    agencyIds.length
      ? client.from('agencies').select('id, name, featured').in('id', agencyIds)
      : Promise.resolve({ data: [] as Row[] }),
  ]);
  const devRows = devs.data ?? [];
  const { data: buildings } = devRows.length
    ? await client.from('buildings').select('id, name, development_id, featured')
      .in('development_id', devRows.map((d: Row) => d.id)).order('sort')
    : { data: [] as Row[] };
  const devName = new Map(devRows.map((d: Row) => [d.id, d.name]));

  return [
    ...(listings.data ?? []).map((r: Row): PromoTarget => ({
      kind: 'listing', id: r.id, name: r.title, sub: [r.unit_no && `Unit ${r.unit_no}`, r.neighborhood].filter(Boolean).join(' · '),
      featured: !!r.featured, active: !!r.active,
    })),
    ...devRows.map((r: Row): PromoTarget => ({
      kind: 'development', id: r.id, name: r.name, sub: r.neighborhood ?? '', featured: !!r.featured, active: !!r.active,
    })),
    ...(buildings ?? []).map((r: Row): PromoTarget => ({
      kind: 'building', id: r.id, name: r.name, sub: devName.get(r.development_id) ?? '', featured: !!r.featured, active: true,
    })),
    ...(agencies.data ?? []).map((r: Row): PromoTarget => ({
      kind: 'agency', id: r.id, name: r.name, sub: 'Agency', featured: !!r.featured, active: true,
    })),
  ];
}

export async function createCampaign(kind: PromoKind, targetId: string, packageId: string): Promise<PromoCampaign> {
  const { data, error } = await (await supabaseServer())
    .rpc('promo_create', { p_kind: kind, p_target: targetId, p_package: packageId });
  if (error) throw new Error(error.message);
  return mapCampaign(data);
}

export async function attachSession(id: string, session: string) {
  const { error } = await (await supabaseServer()).rpc('promo_set_session', { p_id: id, p_session: session });
  if (error) throw new Error(error.message);
}

/**
 * Активувати оплачену кампанію. Адмін — від свого імені; сервер після перевірки
 * в Stripe — із секретом PROMO_SECRET (той самий, що в private.promo_config).
 */
export async function activateCampaign(id: string, method: 'stripe' | 'manual', ref = '', withSecret = false) {
  const p_secret = withSecret ? process.env.PROMO_SECRET ?? null : null;
  const { data, error } = await (await supabaseServer())
    .rpc('promo_activate', { p_id: id, p_method: method, p_ref: ref, p_secret });
  if (error) throw new Error(error.message);
  return mapCampaign(data);
}

export async function cancelCampaign(id: string) {
  const { error } = await (await supabaseServer()).rpc('promo_cancel', { p_id: id });
  if (error) throw new Error(error.message);
}

/** Зняти позначки з кампаній, чий строк вийшов. Основну роботу робить pg_cron, це — підстраховка. */
export async function sweepPromotions() {
  const { error } = await (await supabaseServer()).rpc('promo_sweep');
  if (error) console.error('promo_sweep failed:', error.message);
}

export async function savePackage(input: { id?: string; kind: PromoKind; product?: PromoProduct; days: number; priceCents: number; active: boolean }) {
  const client = await supabaseServer();
  const product = input.product ?? 'featured';
  const row: Row = { target_kind: input.kind, product, days: input.days, price_cents: input.priceCents, active: input.active };
  const write = () => (input.id
    ? client.from('promo_packages').update(row).eq('id', input.id)
    : client.from('promo_packages').upsert(row, { onConflict: 'product' in row ? 'target_kind,product,days' : 'target_kind,days' }));
  let { error } = await write();
  // до міграції 0060 колонки product немає: пакети бувають лише Featured
  if (error && missingColumn(error) && product === 'featured') {
    delete row.product;
    ({ error } = await write());
  }
  if (error) throw new Error(error.message);
}

// ті самі правила, що в lib/track.ts: боти й префетч — не покази
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|viber|skype|lighthouse|headless|curl|wget|python|axios|node-fetch|vercel/i;

/**
 * Показ (обʼєкт був у списку) або перехід (відкрили його сторінку) для кампаній, що йдуть.
 * Пишемо після відповіді, тож сторінка на це не чекає. Без міграції 0046 просто мовчить.
 */
export async function trackPromo(
  kind: PromoKind, items: { id: string; featured?: boolean; sponsored?: boolean; promo?: string[] }[], field: 'impression' | 'click',
) {
  // не лише Featured: будь-який живий вид просування оголошення (міграція 0060)
  const ids = items.filter((i) => i.featured || i.sponsored || i.promo?.length).map((i) => i.id).slice(0, 60);
  if (ids.length === 0) return;
  try {
    const h = await headers();
    const ua = h.get('user-agent') ?? '';
    if (!ua || BOT.test(ua) || h.get('next-router-prefetch') || h.get('purpose') === 'prefetch') return;
    const client = await supabaseServer();
    after(async () => {
      const { error } = await client.rpc('promo_track', { p_kind: kind, p_ids: ids, p_field: field });
      if (error && !/promo_track/.test(error.message)) console.error('promo_track failed:', error.message);
    });
  } catch {
    // поза запитом (збірка) заголовків немає — нічого не рахуємо
  }
}

/* ---------- повернення і «до/після» (міграція 0060) ---------- */

const missingColumn = (e: { code?: string; message?: string }) =>
  e.code === 'PGRST204' || e.code === '42703' || e.code === '42P01' || e.code === 'PGRST202' || e.code === '42883';

/**
 * Гроші повернули — кампанію скасувати й позначки зняти. Адмін — за id від свого імені;
 * вебхук Stripe — за платежем (payment_intent) із секретом PROMO_SECRET.
 * Повертає, скільки кампаній зачепило (0 — платіж не наш).
 */
export async function markRefunded(by: { id: string } | { paymentRef: string }, opts: { amountCents?: number | null; refundRef?: string; withSecret?: boolean } = {}) {
  const { data, error } = await (await supabaseServer()).rpc('promo_refunded', {
    p_id: 'id' in by ? by.id : null,
    p_ref: 'paymentRef' in by ? by.paymentRef : '',
    p_amount: opts.amountCents ?? null,
    p_refund_ref: (opts.refundRef ?? '').slice(0, 200),
    p_secret: opts.withSecret ? process.env.PROMO_SECRET ?? null : null,
  });
  if (error) throw new Error(missingColumn(error) ? 'Run migration 0060 to record refunds' : error.message);
  return Number(data ?? 0);
}

/** Перегляди й заявки «до/під час» для своїх кампаній. Без міграції 0060 — порожньо. */
export async function campaignEffects(ids: string[]): Promise<Record<string, PromoEffect>> {
  if (!ids.length) return {};
  const { data, error } = await (await supabaseServer()).rpc('promo_effect', { p_ids: ids.slice(0, 200) });
  if (error) {
    if (!missingColumn(error)) console.error('promo_effect failed:', error.message);
    return {};
  }
  const out: Record<string, PromoEffect> = {};
  for (const r of (data ?? []) as Row[]) {
    out[r.campaign_id] = {
      campaignId: r.campaign_id, windowDays: Number(r.window_days) || 0,
      viewsBefore: Number(r.views_before) || 0, viewsDuring: Number(r.views_during) || 0,
      leadsBefore: Number(r.leads_before) || 0, leadsDuring: Number(r.leads_during) || 0,
    };
  }
  return out;
}
