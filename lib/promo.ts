import { after } from 'next/server';
import { headers } from 'next/headers';
import { supabaseServer } from './supabase/server';
import type { Agent } from './types';
import type { PromoCampaign, PromoKind, PromoPackage, PromoTarget } from './promoShared';

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
});

const mapCampaign = (r: Row): PromoCampaign => ({
  id: r.id, ownerId: r.owner_id, ownerName: r.owner?.name,
  kind: r.target_kind, targetId: r.target_id, targetName: r.target_name,
  days: r.days, priceCents: r.price_cents, currency: r.currency,
  status: r.status, payMethod: r.pay_method, payRef: r.pay_ref,
  paidAt: r.paid_at, startsAt: r.starts_at, endsAt: r.ends_at,
  impressions: r.impressions, clicks: r.clicks, createdAt: r.created_at,
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

export async function getCampaign(id: string): Promise<PromoCampaign | null> {
  const { data } = await (await supabaseServer()).from('promo_campaigns').select('*').eq('id', id).maybeSingle();
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

export async function savePackage(input: { id?: string; kind: PromoKind; days: number; priceCents: number; active: boolean }) {
  const client = await supabaseServer();
  const row = { target_kind: input.kind, days: input.days, price_cents: input.priceCents, active: input.active };
  const { error } = input.id
    ? await client.from('promo_packages').update(row).eq('id', input.id)
    : await client.from('promo_packages').upsert(row, { onConflict: 'target_kind,days' });
  if (error) throw new Error(error.message);
}

// ті самі правила, що в lib/track.ts: боти й префетч — не покази
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|viber|skype|lighthouse|headless|curl|wget|python|axios|node-fetch|vercel/i;

/**
 * Показ (обʼєкт був у списку) або перехід (відкрили його сторінку) для кампаній, що йдуть.
 * Пишемо після відповіді, тож сторінка на це не чекає. Без міграції 0046 просто мовчить.
 */
export async function trackPromo(kind: PromoKind, items: { id: string; featured: boolean }[], field: 'impression' | 'click') {
  const ids = items.filter((i) => i.featured).map((i) => i.id).slice(0, 60);
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
